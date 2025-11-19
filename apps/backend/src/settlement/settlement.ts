import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Settlement Service
 * Handles market resolution and position settlement
 */
export class SettlementService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  /**
   * Settle all positions for a resolved market
   * Called when market status changes to RESOLVED
   */
  async settleMarket(marketId: string): Promise<void> {
    this.logger.info({ marketId }, 'Starting market settlement');

    await this.prisma.$transaction(async (tx) => {
      // Get market
      const market = await tx.market.findUnique({
        where: { id: marketId },
      });

      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      if (market.status !== 'RESOLVED') {
        throw new Error(`Market ${marketId} is not resolved`);
      }

      if (!market.outcome) {
        throw new Error(`Market ${marketId} has no outcome`);
      }

      // Get all positions for this market
      const positions = await tx.position.findMany({
        where: { marketId },
      });

      this.logger.info(
        { marketId, outcome: market.outcome, positions: positions.length },
        'Settling positions'
      );

      let totalPayout = 0;

      // Settle each position
      for (const position of positions) {
        const quantity = Number(position.quantity);

        if (quantity === 0) continue;

        // Winning positions get $1 per share
        // Losing positions get $0
        const payout = position.outcome === market.outcome ? quantity * 1.0 : 0;

        if (payout > 0) {
          // Update user balance
          await tx.balance.update({
            where: { userId: position.userId },
            data: {
              available: { increment: payout },
              total: { increment: payout },
            },
          });

          totalPayout += payout;

          this.logger.info(
            {
              userId: position.userId,
              outcome: position.outcome,
              quantity,
              payout,
            },
            'Position settled'
          );
        }

        // Mark position as settled
        await tx.position.update({
          where: { id: position.id },
          data: {
            updatedAt: new Date(),
          },
        });
      }

      this.logger.info(
        { marketId, totalPayout, settledPositions: positions.length },
        'Market settlement complete'
      );
    });
  }

  /**
   * Batch settle multiple markets
   * Useful for scheduled resolution jobs
   */
  async settleBatch(marketIds: string[]): Promise<{ settled: string[]; failed: string[] }> {
    const settled: string[] = [];
    const failed: string[] = [];

    for (const marketId of marketIds) {
      try {
        await this.settleMarket(marketId);
        settled.push(marketId);
      } catch (error) {
        this.logger.error({ marketId, error }, 'Failed to settle market');
        failed.push(marketId);
      }
    }

    return { settled, failed };
  }

  /**
   * Get settlement report for a market
   */
  async getSettlementReport(marketId: string): Promise<{
    market: any;
    totalPositions: number;
    winningPositions: number;
    losingPositions: number;
    totalPayout: number;
  }> {
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }

    const positions = await this.prisma.position.findMany({
      where: { marketId },
    });

    const winningPositions = positions.filter((p) => p.outcome === market.outcome);
    const losingPositions = positions.filter((p) => p.outcome !== market.outcome);

    const totalPayout = winningPositions.reduce(
      (sum, p) => sum + Number(p.quantity) * 1.0,
      0
    );

    return {
      market,
      totalPositions: positions.length,
      winningPositions: winningPositions.length,
      losingPositions: losingPositions.length,
      totalPayout,
    };
  }
}
