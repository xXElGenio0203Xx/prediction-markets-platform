
import React, { useState, useEffect } from 'react';
import { Order } from "@/api/entities";
import { Position } from "@/api/entities";
import { Market as MarketEntity } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ShoppingCart, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { broadcastMarketUpdate } from "@/api/functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Removed: import { placeOrder } from "@/api/functions"; // Will be dynamically imported

export default function TradeWidget({ market, user, onOrderPlaced, selectedOutcome, onOutcomeChange }) {
  const [probability, setProbability] = useState(50); // Represents price as a percentage
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderStatus, setLastOrderStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userPositions, setUserPositions] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, side: null });

  // Fetch fresh user on mount and whenever an order is placed to refresh Bruno Dollars
  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await User.me();
        setCurrentUser(me);
        console.log('✅ Loaded current user:', me.email);
      } catch (error) {
        console.log('No user logged in', error);
        setCurrentUser(null);
      }
    };
    loadUser();
  }, [onOrderPlaced]); // Re-fetch user after an order is placed

  // Load user positions for this market
  useEffect(() => {
    const loadPositions = async () => {
      if (!currentUser || !market?.id) return;
      try {
        const positions = await Position.filter({
          user_id: currentUser.email,
          market_id: market.id
        });
        setUserPositions(positions);
      } catch (error) {
        console.error('Error loading positions:', error);
        setUserPositions([]);
      }
    };
    loadPositions();
  }, [currentUser, market.id, lastOrderStatus]); // Reload positions when user changes, market changes, or an order status updates

  // Calculate total contracts in this market (absolute value of shares for both YES/NO)
  const totalContracts = userPositions.reduce((sum, p) => sum + Math.abs(p.shares), 0);
  const remainingCapacity = Math.max(0, 100 - totalContracts); // Max 100 contracts per market

  // Calculate values for display and order placement
  const numQuantity = parseInt(quantity) || 0;
  const price = probability / 100; // Price derived from probability
  const cost = (price * numQuantity).toFixed(2);
  const potentialPayout = numQuantity.toFixed(2); // Payout is always 1 per contract if correct
  const expectedProfit = (parseFloat(potentialPayout) - parseFloat(cost)).toFixed(2);

  // Check if user can trade
  const canTrade = currentUser && currentUser.email && currentUser.email.toLowerCase().endsWith('@brown.edu');
  const userCash = currentUser?.bruno_dollars || 0;
  const hasEnoughCash = userCash >= parseFloat(cost);
  const withinLimit = numQuantity <= remainingCapacity;

  // Get available shares for selling the selected outcome
  const selectedPosition = userPositions.find(p => p.outcome === selectedOutcome && p.shares > 0);
  const availableShares = selectedPosition ? selectedPosition.shares : 0;

  const matchAndExecuteOrders = async (newOrder) => {
    try {
      const allOrders = await Order.filter({ 
        market_id: newOrder.market_id, 
        status: 'open',
        outcome: newOrder.outcome
      });
      
      const oppositeOrders = allOrders.filter(order => {
        if (order.user_id === newOrder.user_id) return false;
        
        if (newOrder.side === 'buy' && order.side === 'sell') {
          return order.price <= newOrder.price;
        }
        if (newOrder.side === 'sell' && order.side === 'buy') {
          return order.price >= newOrder.price;
        }
        return false;
      }).sort((a, b) => {
        if (newOrder.side === 'buy') {
          return a.price - b.price;
        } else {
          return b.price - a.price;
        }
      });

      let remainingQuantity = newOrder.quantity;
      const executions = [];

      for (const matchingOrder of oppositeOrders) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = matchingOrder.quantity - (matchingOrder.filled_quantity || 0);
        const executableQuantity = Math.min(remainingQuantity, availableQuantity);
        
        if (executableQuantity > 0) {
          const executionPrice = matchingOrder.price;
          
          try {
            const newFilledQuantity = (matchingOrder.filled_quantity || 0) + executableQuantity;
            const newStatus = newFilledQuantity >= matchingOrder.quantity ? 'filled' : 'open';
            
            await Order.update(matchingOrder.id, {
              filled_quantity: newFilledQuantity,
              status: newStatus
            });

            await createOrUpdatePosition(
              newOrder.user_id, 
              newOrder.market_id, 
              newOrder.outcome, 
              executableQuantity, 
              executionPrice, 
              newOrder.side
            );
            
            await createOrUpdatePosition(
              matchingOrder.user_id, 
              matchingOrder.market_id, 
              matchingOrder.outcome, 
              executableQuantity, 
              executionPrice, 
              matchingOrder.side
            );

            try {
              if (!newOrder.market_id.includes('demo') && !newOrder.market_id.includes('fallback')) {
                const allMarkets = await MarketEntity.list(); // Fetch all markets
                const marketToUpdate = allMarkets.find(m => m.id === newOrder.market_id);
                
                if (marketToUpdate) {
                  await MarketEntity.update(newOrder.market_id, {
                    current_price: executionPrice,
                    volume: (marketToUpdate.volume || 0) + (executionPrice * executableQuantity)
                  });
                }
              }
            } catch (marketError) {
              console.log("Could not update market:", marketError);
            }

            executions.push({
              price: executionPrice,
              quantity: executableQuantity,
              counterparty: matchingOrder.user_id
            });

            remainingQuantity -= executableQuantity;
            
          } catch (executionError) {
            console.error("Error executing trade:", executionError);
          }
        }
      }

      const filledQuantity = newOrder.quantity - remainingQuantity;
      const orderStatus = filledQuantity >= newOrder.quantity ? 'filled' : 'open';
      
      await Order.update(newOrder.id, {
        filled_quantity: filledQuantity,
        status: orderStatus
      });

      return {
        executions: executions.length,
        filledQuantity: filledQuantity,
        remainingQuantity: remainingQuantity,
        executionDetails: executions
      };

    } catch (error) {
      console.error("Error in order matching:", error);
      return { 
        executions: 0, 
        filledQuantity: 0, 
        remainingQuantity: newOrder.quantity,
        error: error.message 
      };
    }
  };

  const createOrUpdatePosition = async (userId, marketId, outcome, quantity, price, side) => {
    try {
      const existingPositions = await Position.filter({
        user_id: userId,
        market_id: marketId,
        outcome: outcome
      });

      const q = Number(quantity);
      const execPriceOutcome = Number(price); // already in the OUTCOME's own units (YES=x, NO=y)

      if (existingPositions.length > 0) {
        const position = existingPositions[0];
        const currentShares = Number(position.shares || 0);
        // Use entry_price_outcome if it exists, otherwise fallback to avg_price (legacy), then current execution price
        const currentEntry = (position.entry_price_outcome ?? position.avg_price) ?? execPriceOutcome;

        if (side === 'buy') {
          const newShares = currentShares + q;
          // VWAP in outcome units
          const newEntry = ((currentEntry * currentShares) + (execPriceOutcome * q)) / Math.max(1, newShares);
          await Position.update(position.id, {
            shares: newShares,
            entry_price_outcome: Number(newEntry.toFixed(2)),
            // keep legacy avg_price in sync for display
            avg_price: Number(newEntry.toFixed(2))
          });
        } else { // side === 'sell'
          // Sell reduces shares; avg entry (entry_price_outcome) should NOT change
          const newShares = Math.max(0, currentShares - q);
          await Position.update(position.id, {
            shares: newShares,
            entry_price_outcome: Number(currentEntry.toFixed(2)),
            avg_price: Number(currentEntry.toFixed(2))
          });
        }
      } else {
        // Create new position with outcome-denominated entry price
        const initialEntry = Number(execPriceOutcome.toFixed(2));
        const initialShares = side === 'buy' ? q : 0; // If side is 'sell' and no position exists, it shouldn't create a negative position. Validation should prevent this case.

        await Position.create({
          user_id: userId,
          market_id: marketId,
          outcome: outcome,
          shares: initialShares, // This should only be `q` if side is 'buy' and no position exists.
          entry_price_outcome: initialEntry,
          avg_price: initialEntry, // Sync legacy avg_price
          unrealized_pnl: 0,
          realized_pnl: 0
        });
      }
    } catch (error) {
      console.error("Error updating position (entry_price_outcome):", error);
    }
  };

  const handleSubmitOrder = async (side) => {
    console.log('🚀 Starting order submission for side:', side);
    
    if (!currentUser) {
      setLastOrderStatus({ type: 'error', message: 'Please sign in to trade.' });
      return;
    }

    if (!quantity || numQuantity === 0) {
      setLastOrderStatus({ type: 'error', message: 'Please enter a quantity.' });
      return;
    }

    if (numQuantity < 1 || numQuantity > 100) {
      setLastOrderStatus({ type: 'error', message: 'Quantity must be between 1 and 100.' });
      return;
    }

    if (side === 'buy' && (!hasEnoughCash || !withinLimit)) {
        setLastOrderStatus({ type: 'error', message: 'Cannot place buy order: Insufficient funds or exceeding contract limit.' });
        return;
    }

    if (side === 'sell' && availableShares < numQuantity) {
        setLastOrderStatus({ type: 'error', message: `Cannot place sell order: You only have ${availableShares} ${selectedOutcome.toUpperCase()} contracts to sell.` });
        return;
    }

    setIsSubmitting(true);
    setLastOrderStatus(null);
    setConfirmDialog({ open: false, side: null }); // Close dialog immediately

    try {
      console.log('📤 Calling placeOrder function with params:', {
        market_id: market.id,
        side,
        outcome: selectedOutcome,
        probability: probability, // Using probability instead of price
        quantity: numQuantity
      });
      
      // Import the function dynamically
      const { placeOrder } = await import('@/api/functions');
      
      // Call the function
      let response;
      try {
        response = await placeOrder({
          market_id: market.id,
          side: side,
          outcome: selectedOutcome,
          probability: probability,
          quantity: numQuantity
        });
        console.log('📥 Raw response:', response);
      } catch (callError) {
        console.error('❌ Function call error during placeOrder:', callError);
        console.error('Error details:', {
          message: callError.message,
          response: callError.response,
          status: callError.response?.status,
          data: callError.response?.data,
          stack: callError.stack
        });
        throw callError; // Re-throw to be caught by the outer catch block
      }

      // Check if response has data property (axios response)
      const responseData = response?.data || response;
      console.log('📦 Response data:', responseData);

      if (responseData && responseData.success) {
        const newOrder = responseData.order;
        
        console.log('✅ Order placed successfully:', newOrder.id);

        // Broadcast order placed
        try {
          await broadcastMarketUpdate({
            market_id: market.id,
            event_type: 'order_placed',
            data: {
              order_id: newOrder.id,
              side: side,
              outcome: selectedOutcome,
              probability: probability,
              quantity: numQuantity
            }
          });
        } catch (broadcastError) {
          console.log('Failed to broadcast order placed event:', broadcastError);
        }

        // Try to match and execute
        const matchResult = await matchAndExecuteOrders(newOrder);

        if (matchResult.filledQuantity > 0) {
          try {
            await broadcastMarketUpdate({
              market_id: market.id,
              event_type: 'trade_executed',
              data: {
                filled_quantity: matchResult.filledQuantity,
                executions: matchResult.executionDetails
              }
            });
          } catch (broadcastError) {
            console.log('Failed to broadcast execution event:', broadcastError);
          }
        }

        // Success message
        let message = '';
        if (matchResult.filledQuantity > 0) {
          if (matchResult.filledQuantity >= numQuantity) {
            message = `✅ Order fully executed! ${matchResult.filledQuantity} contracts filled.`;
          } else {
            message = `✅ Order partially filled: ${matchResult.filledQuantity}/${numQuantity} contracts.`;
          }
        } else {
          message = `✅ Order placed: ${numQuantity} ${selectedOutcome.toUpperCase()} contracts at ${probability}%.`;
        }

        setLastOrderStatus({ type: 'success', message: message });

        // Reset form
        setQuantity('');
        setProbability(50); // Reset probability to default

        if (onOrderPlaced) {
          onOrderPlaced(); // Trigger a refresh in the parent component
        }

      } else {
        const errorMsg = responseData?.error || 'Failed to place order';
        console.error('❌ Order placement failed:', errorMsg);
        console.error('Full response data:', responseData); // Log the full responseData for more context
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error("❌ ERROR PLACING ORDER:");
      console.error("Message:", error.message);
      console.error("Response status:", error.response?.status);
      console.error("Response data:", error.response?.data);
      console.error("Stack:", error.stack);
      
      let errorMessage = 'Failed to place order. Please try again.';
      
      // Better error message extraction
      if (error.response?.status === 403) {
        errorMessage = error.response?.data?.error || 'Access denied. Only @brown.edu users can trade.';
        console.error("403 ERROR - Access denied. Check if:", {
          userEmail: currentUser?.email,
          isBrownEmail: currentUser?.email?.endsWith('@brown.edu'),
          responseError: error.response?.data?.error,
          responseDetails: error.response?.data?.details
        });
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `: ${error.response.data.details}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLastOrderStatus({ 
        type: 'error', 
        message: errorMessage
      });
    }

    setIsSubmitting(false);
  };

  const openConfirmDialog = (side) => {
    setConfirmDialog({ open: true, side });
  };

  return (
    <>
      <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#4E3629]/5 bg-gradient-to-r from-[#FAF3E0] to-[#F5EED8]">
          <CardTitle className="text-lg font-semibold text-[#4E3629] flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#A97142]" />
            Place Your Prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!canTrade && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl flex items-center gap-3 bg-amber-50 text-amber-900 border border-amber-200"
            >
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">
                  {currentUser ? `Only @brown.edu email addresses can trade.` : "Please sign in with a @brown.edu email to trade."}
                </p>
              </div>
            </motion.div>
          )}

          {/* Contract Limit Warning */}
          {totalContracts >= 80 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl flex items-center gap-3 bg-orange-50 text-orange-900 border border-orange-200"
            >
              <Info className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">
                  You currently hold {totalContracts} contracts in this market. Remaining capacity: {remainingCapacity}.
                </p>
              </div>
            </motion.div>
          )}

          {/* Outcome Pills */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: canTrade ? 1.02 : 1 }}
              whileTap={{ scale: canTrade ? 0.98 : 1 }}
              onClick={() => onOutcomeChange('yes')}
              disabled={!canTrade}
              className={`flex-1 py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedOutcome === 'yes'
                  ? 'bg-[#50C878] text-white shadow-lg shadow-[#50C878]/30'
                  : 'bg-[#50C878]/10 text-[#50C878] border-2 border-[#50C878]/20 hover:border-[#50C878]/40'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              YES
            </motion.button>
            <motion.button
              whileHover={{ scale: canTrade ? 1.02 : 1 }}
              whileTap={{ scale: canTrade ? 0.98 : 1 }}
              onClick={() => onOutcomeChange('no')}
              disabled={!canTrade}
              className={`flex-1 py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedOutcome === 'no'
                  ? 'bg-[#E34234] text-white shadow-lg shadow-[#E34234]/30'
                  : 'bg-[#E34234]/10 text-[#E34234] border-2 border-[#E34234]/20 hover:border-[#E34234]/40'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              NO
            </motion.button>
          </div>

          {/* Probability Slider */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-[#4E3629]">
              How likely is {selectedOutcome.toUpperCase()}? <span className="text-[#A97142]">{probability}%</span>
            </Label>
            <Slider
              value={[probability]}
              onValueChange={(value) => setProbability(value[0])}
              min={1}
              max={99}
              step={1}
              disabled={!canTrade}
              className="w-full [&_span]:bg-[#A97142] [&_div[role=slider]]:bg-[#A97142] [&_div[role=slider]]:border-[#A97142]"
            />
            <div className="flex justify-between text-xs text-[#4E3629]/50">
              <span>1% (Unlikely)</span>
              <span>99% (Very Likely)</span>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-semibold text-[#4E3629]">
              Quantity (Contracts)
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={remainingCapacity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Max: ${remainingCapacity}`}
              disabled={!canTrade}
              className="border-[#4E3629]/20 focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-[#A97142] focus:border-[#A97142] text-lg px-4 py-3 rounded-lg"
            />
            <p className="text-xs text-[#4E3629]/60">
              Enter 1-{remainingCapacity} contracts (you hold {totalContracts}/100 in this market)
            </p>
          </div>

          {/* Live Projection Box */}
          {quantity && numQuantity > 0 && currentUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-r from-[#A97142]/10 to-[#50C878]/10 p-5 rounded-xl border-2 border-[#A97142]/30"
            >
              <h4 className="font-bold text-[#4E3629] mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Prediction Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#4E3629]/60">Your Cash</span>
                  <span className="font-semibold text-[#4E3629]">${userCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#4E3629]/60">Cost</span>
                  <span className="font-bold text-[#4E3629] text-lg">${cost}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#4E3629]/60">Potential Payout (if correct)</span>
                  <span className="font-semibold text-[#50C878]">${potentialPayout}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-[#A97142]/20">
                  <span className="text-[#4E3629]/60">Expected Profit</span>
                  <span className={`font-bold text-lg ${parseFloat(expectedProfit) >= 0 ? 'text-[#50C878]' : 'text-[#E34234]'}`}>
                    {parseFloat(expectedProfit) >= 0 ? '+' : ''}${expectedProfit}
                  </span>
                </div>
              </div>

              {/* If/Else Outcomes */}
              <div className="mt-4 pt-4 border-t-2 border-[#A97142]/20 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-[#50C878]" />
                  <span className="text-[#50C878] font-semibold">
                    If {selectedOutcome.toUpperCase()} wins: You gain ${expectedProfit}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-[#E34234]" />
                  <span className="text-[#E34234] font-semibold">
                    If {selectedOutcome.toUpperCase()} loses: You lose ${cost}
                  </span>
                </div>
              </div>

              {/* Warnings */}
              {!hasEnoughCash && (
                <div className="mt-3 p-3 bg-[#E34234]/10 border border-[#E34234]/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#E34234]" />
                  <p className="text-xs text-[#E34234] font-medium">
                    ⚠️ You don't have enough Bruno Dollars to place this trade.
                  </p>
                </div>
              )}

              {!withinLimit && (
                <div className="mt-3 p-3 bg-[#E34234]/10 border border-[#E34234]/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#E34234]" />
                  <p className="text-xs text-[#E34234] font-medium">
                    ⚠️ Exceeds your remaining capacity of {remainingCapacity} contracts in this market.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Order Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => openConfirmDialog('buy')}
              disabled={isSubmitting || !canTrade || !quantity || numQuantity === 0 || !hasEnoughCash || !withinLimit}
              className="flex-1 bg-[#50C878] hover:bg-[#3FA963] text-white font-semibold py-6 rounded-xl shadow-lg disabled:bg-gray-300 disabled:shadow-none"
            >
              BUY {selectedOutcome.toUpperCase()}
            </Button>
            <Button
              onClick={() => openConfirmDialog('sell')}
              disabled={isSubmitting || !canTrade || !quantity || numQuantity === 0 || availableShares < numQuantity}
              className="flex-1 bg-[#E34234] hover:bg-[#C93529] text-white font-semibold py-6 rounded-xl shadow-lg disabled:bg-gray-300 disabled:shadow-none"
            >
              SELL {selectedOutcome.toUpperCase()}
            </Button>
          </div>

          {availableShares < numQuantity && numQuantity > 0 && (
            <p className="text-xs text-[#E34234] text-center">
              Cannot sell {numQuantity} contracts. You only have {availableShares} {selectedOutcome.toUpperCase()} contracts.
            </p>
          )}

          {/* Status Message */}
          <AnimatePresence>
            {lastOrderStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  lastOrderStatus.type === 'success'
                    ? 'bg-[#50C878]/10 text-[#50C878] border border-[#50C878]/20'
                    : 'bg-[#E34234]/10 text-[#E34234] border border-[#E34234]/20'
                }`}
              >
                {lastOrderStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <p className="text-sm font-medium">{lastOrderStatus.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, side: null })}>
        <DialogContent className="bg-white border-2 border-[#A97142]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#4E3629]">Confirm Your Prediction</DialogTitle>
            <DialogDescription className="text-[#4E3629]/70 text-base">
              Review your trade before confirming
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-6 space-y-4">
            <div className="bg-gradient-to-r from-[#FAF3E0] to-[#F5EED8] p-4 rounded-xl border border-[#A97142]/30">
              <p className="text-[#4E3629] font-semibold mb-2">
                You're predicting <span className={selectedOutcome === 'yes' ? 'text-[#50C878]' : 'text-[#E34234]'}>{selectedOutcome.toUpperCase()}</span> with {probability}% confidence
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[#4E3629]/60">Contracts:</p>
                  <p className="font-bold text-[#4E3629]">{numQuantity}</p>
                </div>
                <div>
                  <p className="text-[#4E3629]/60">Cost:</p>
                  <p className="font-bold text-[#4E3629]">${cost}</p>
                </div>
                <div>
                  <p className="text-[#4E3629]/60">Potential Payout:</p>
                  <p className="font-bold text-[#50C878]">${potentialPayout}</p>
                </div>
                <div>
                  <p className="text-[#4E3629]/60">Expected Profit:</p>
                  <p className={`font-bold ${parseFloat(expectedProfit) >= 0 ? 'text-[#50C878]' : 'text-[#E34234]'}`}>
                    {parseFloat(expectedProfit) >= 0 ? '+' : ''}${expectedProfit}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-[#4E3629]/60 space-y-1">
              <p>• You will pay ${cost} now</p>
              <p>• If {selectedOutcome.toUpperCase()} wins, you'll receive ${potentialPayout}</p>
              <p>• If {selectedOutcome.toUpperCase()} loses, you'll receive $0</p>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, side: null })}
              className="border-[#A97142] text-[#4E3629] hover:bg-[#A97142]/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmitOrder(confirmDialog.side)}
              disabled={isSubmitting}
              className={confirmDialog.side === 'buy' ? 
                "bg-[#50C878] hover:bg-[#3FA963] text-white font-bold" : 
                "bg-[#E34234] hover:bg-[#C93529] text-white font-bold"
              }
            >
              {isSubmitting ? 'Processing...' : `Confirm ${confirmDialog.side?.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
