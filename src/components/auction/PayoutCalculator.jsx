import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, Calculator, ArrowRight } from 'lucide-react';

export default function PayoutCalculator({ indicativePrice, selectedOutcome }) {
  const [quantity, setQuantity] = useState(100);
  const [customPrice, setCustomPrice] = useState('');
  
  const effectivePrice = customPrice ? parseFloat(customPrice) / 100 : (
    selectedOutcome === 'YES' ? indicativePrice.yesPrice : indicativePrice.noPrice
  );

  const calculatePayouts = () => {
    if (!effectivePrice || effectivePrice <= 0) return null;

    const investment = effectivePrice * quantity;
    const maxPayout = quantity * 1.00; // $1 per winning contract
    const profit = maxPayout - investment;
    const roi = ((profit / investment) * 100).toFixed(1);
    const impliedProbability = (effectivePrice * 100).toFixed(1);

    return {
      investment: investment.toFixed(2),
      maxPayout: maxPayout.toFixed(2),
      profit: profit.toFixed(2),
      roi: roi,
      impliedProbability: impliedProbability,
      breakeven: (effectivePrice * 100).toFixed(0), // Convert to cents
      priceInCents: (effectivePrice * 100).toFixed(0)
    };
  };

  const payouts = calculatePayouts();

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-purple-600" />
          Projected Payout Calculator
        </CardTitle>
        <p className="text-sm text-gray-600">Estimate your returns if {selectedOutcome} wins</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="calc-qty" className="text-sm font-medium text-gray-700">Contracts</Label>
            <Input
              id="calc-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="calc-price" className="text-sm font-medium text-gray-700">
              Price (¢ per share)
            </Label>
            <Input
              id="calc-price"
              type="number"
              step="1"
              min="1"
              max="99"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={(effectivePrice * 100).toFixed(0)}
              className="mt-1"
            />
          </div>
        </div>

        {payouts && (
          <>
            {/* Investment Summary */}
            <div className="bg-white rounded-xl p-4 border border-purple-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Total Investment</span>
                <span className="text-2xl font-bold text-gray-900">${payouts.investment}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <DollarSign className="w-3 h-3" />
                {quantity} contracts × {payouts.priceInCents}¢ each
              </div>
            </div>

            {/* Payout Scenarios */}
            <div className="space-y-3">
              {/* If Wins */}
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-white">IF {selectedOutcome} WINS</Badge>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Total Payout</span>
                    <span className="text-xl font-bold text-green-700">${payouts.maxPayout}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Net Profit</span>
                    <span className="text-lg font-bold text-green-600">+${payouts.profit}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-gray-700">ROI</span>
                    <span className="text-lg font-bold text-green-600">+{payouts.roi}%</span>
                  </div>
                </div>
              </div>

              {/* If Loses */}
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-300">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-red-600 text-white">IF {selectedOutcome} LOSES</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Total Payout</span>
                    <span className="text-xl font-bold text-red-700">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Net Loss</span>
                    <span className="text-lg font-bold text-red-600">-${payouts.investment}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-red-200">
                    <span className="text-sm font-medium text-gray-700">ROI</span>
                    <span className="text-lg font-bold text-red-600">-100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Insights */}
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-300">
              <h4 className="font-semibold text-amber-900 mb-2 text-sm">Market Insights</h4>
              <div className="space-y-1 text-xs text-amber-800">
                <div className="flex justify-between">
                  <span>Implied Probability:</span>
                  <span className="font-bold">{payouts.impliedProbability}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Breakeven Price:</span>
                  <span className="font-bold">{payouts.breakeven}¢</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Gain/Loss Ratio:</span>
                  <span className="font-bold">{(parseFloat(payouts.profit) / parseFloat(payouts.investment)).toFixed(2)}x</span>
                </div>
              </div>
            </div>

            {/* Expected Value (EV) */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-300">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900 text-sm">Expected Value (EV)</h4>
              </div>
              <p className="text-xs text-blue-800 mb-2">
                If market probabilities are accurate:
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Expected Return:</span>
                <span className="text-lg font-bold text-blue-900">
                  ${((parseFloat(payouts.impliedProbability) / 100) * parseFloat(payouts.maxPayout) - parseFloat(payouts.investment)).toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}