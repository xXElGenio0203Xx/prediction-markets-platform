
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BidCard({
  market,
  auctionStats,
  indicativePrice,
  user,
  onBidSubmit,
  isClearing = false
}) {
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [probability, setProbability] = useState(50);
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });

  // Determine if auction is closed
  // TEMPORARILY DISABLED - Making auction 24/7 for testing
  // const now = new Date();
  // const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  // const hour = et.getHours();
  // Auction is open between 9 AM ET (inclusive) and 12 PM ET (exclusive)
  // const isAuctionClosed = hour < 9 || hour >= 12;

  // TEMPORARY: Force auction to always be open (24/7)
  const isAuctionClosed = false;

  // Use clearing price if auction is closed, otherwise use live stats or fall back to indicative price
  const yesPrice = isAuctionClosed
    ? (market.last_clearing_price || 0.50)
    : (auctionStats?.yesPercentage || indicativePrice?.yesPrice || market.last_clearing_price || 0.50);

  const noPrice = isAuctionClosed
    ? (1 - (market.last_clearing_price || 0.50))
    : (auctionStats?.noPercentage || indicativePrice?.noPrice || (1 - (market.last_clearing_price || 0.50)));

  const yesPercent = Math.round(yesPrice * 100);
  const noPercent = Math.round(noPrice * 100);

  const totalBids = auctionStats?.totalBids || indicativePrice?.totalOrders || 0;

  // Calculate values
  const numQuantity = parseInt(quantity) || 0;
  const estimatedCost = ((probability / 100) * numQuantity).toFixed(2);
  const potentialPayout = numQuantity.toFixed(2);
  const projectedProfit = (numQuantity - parseFloat(estimatedCost)).toFixed(2);
  const expectedValue = ((probability / 100) * numQuantity - parseFloat(estimatedCost)).toFixed(2);

  // User balance
  const userBalance = user?.bruno_dollars || 0;
  const hasEnoughBalance = userBalance >= parseFloat(estimatedCost);

  // Contract limits
  const maxContracts = 100;
  const withinLimit = numQuantity <= maxContracts;

  const handleOutcomeSelect = (outcome) => {
    if (isClearing || isAuctionClosed) return; // Prevent selection if auction is clearing or closed
    setSelectedOutcome(outcome);
    // Set default probability to current market price
    if (outcome === 'yes') {
      setProbability(yesPercent);
    } else {
      setProbability(noPercent);
    }
  };

  const handleSubmitBid = () => {
    if (!user) {
      alert('Please sign in to place bids');
      return;
    }

    if (isClearing) {
      alert('Auction is currently clearing. Please wait.');
      return;
    }

    if (isAuctionClosed) {
      alert('Auction is closed. You cannot place new bids.');
      return;
    }

    if (!quantity || numQuantity === 0) {
      alert('Please enter a quantity');
      return;
    }

    if (!hasEnoughBalance) {
      alert(`Insufficient funds. You need $${estimatedCost}, but only have $${userBalance.toFixed(2)}.`);
      return;
    }

    if (!withinLimit) {
      alert(`Maximum ${maxContracts} contracts per market.`);
      return;
    }

    setConfirmDialog({ open: true });
  };

  const handleConfirmBid = async () => {
    setIsSubmitting(true);
    setConfirmDialog({ open: false });

    try {
      await onBidSubmit({
        outcome: selectedOutcome,
        probability: probability,
        quantity: numQuantity
      });

      // Reset form
      setSelectedOutcome(null);
      setQuantity('');
      setProbability(50);
    } catch (error) {
      console.error('Error submitting bid:', error);
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <Card className="bg-white border-2 border-[#4E3629]/10 shadow-xl rounded-2xl overflow-hidden relative">
        <CardContent className="p-8">
          {/* Clearing Lock Overlay */}
          {isClearing && (
            <div className="absolute inset-0 bg-purple-900/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
              <div className="text-center text-white p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <h3 className="text-xl font-bold mb-2">Auction Clearing</h3>
                <p className="text-sm">Orders are being matched...</p>
                <p className="text-xs mt-2 opacity-80">New bids will be available after 12:15 PM ET</p>
              </div>
            </div>
          )}

          {/* Auction Closed Overlay */}
          {!isClearing && isAuctionClosed && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
              <div className="text-center text-white p-6">
                <AlertCircle className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Auction Closed</h3>
                <p className="text-sm">Bidding is closed for this market.</p>
                <p className="text-xs mt-2 opacity-80">New markets will open at 9 AM ET.</p>
              </div>
            </div>
          )}


          {/* Indicative Price Label */}
          {!isAuctionClosed && totalBids > 0 && (
            <motion.div
              className="mb-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                📊 Indicative: {yesPercent}% YES / {noPercent}% NO (based on {totalBids} bids)
              </Badge>
            </motion.div>
          )}

          {/* Show clearing price after auction */}
          {isAuctionClosed && (
            <motion.div
              className="mb-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                ✅ Last Cleared: {yesPercent}% YES / {noPercent}% NO
              </Badge>
            </motion.div>
          )}

          {/* Yes/No Buttons - GREEN for Yes, RED for No */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <motion.button
              key={`yes-${yesPercent}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOutcomeSelect('yes')}
              className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                selectedOutcome === 'yes'
                  ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-500 shadow-lg shadow-green-500/30'
                  : 'bg-white border-[#4E3629]/20 hover:border-green-500/50 hover:shadow-md'
              } ${isClearing || isAuctionClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isClearing || isAuctionClosed}
            >
              <div className="flex flex-col items-center gap-2">
                <TrendingUp className={`w-8 h-8 ${selectedOutcome === 'yes' ? 'text-white' : 'text-green-600'}`} />
                <span className={`text-sm font-semibold ${selectedOutcome === 'yes' ? 'text-white' : 'text-[#4E3629]'}`}>
                  Buy Yes
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={yesPercent}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.4 }}
                    className={`text-3xl font-bold ${selectedOutcome === 'yes' ? 'text-white' : 'text-green-600'}`}
                  >
                    {yesPercent}%
                  </motion.div>
                </AnimatePresence>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute top-2 right-2">
                        <Info className={`w-4 h-4 ${selectedOutcome === 'yes' ? 'text-white/70' : 'text-[#4E3629]/40'}`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Current market consensus: {yesPercent}% YES
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.button>

            <motion.button
              key={`no-${noPercent}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOutcomeSelect('no')}
              className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                selectedOutcome === 'no'
                  ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-500 shadow-lg shadow-red-500/30'
                  : 'bg-white border-[#4E3629]/20 hover:border-red-500/50 hover:shadow-md'
              } ${isClearing || isAuctionClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isClearing || isAuctionClosed}
            >
              <div className="flex flex-col items-center gap-2">
                <TrendingDown className={`w-8 h-8 ${selectedOutcome === 'no' ? 'text-white' : 'text-red-600'}`} />
                <span className={`text-sm font-semibold ${selectedOutcome === 'no' ? 'text-white' : 'text-[#4E3629]'}`}>
                  Buy No
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={noPercent}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.4 }}
                    className={`text-3xl font-bold ${selectedOutcome === 'no' ? 'text-white' : 'text-red-600'}`}
                  >
                    {noPercent}%
                  </motion.div>
                </AnimatePresence>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute top-2 right-2">
                        <Info className={`w-4 h-4 ${selectedOutcome === 'no' ? 'text-white/70' : 'text-[#4E3629]/40'}`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Current market consensus: {noPercent}% NO
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.button>
          </div>

          {/* Bidding Panel */}
          <AnimatePresence>
            {selectedOutcome && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 pt-6 border-t-2 border-[#4E3629]/10"
              >
                {/* Probability Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-[#4E3629]">
                      Your Confidence Level
                    </Label>
                    <Badge className="bg-[#A97142] text-white font-bold text-lg px-3 py-1">
                      {probability}%
                    </Badge>
                  </div>
                  <Slider
                    value={[probability]}
                    onValueChange={(value) => setProbability(value[0])}
                    min={1}
                    max={99}
                    step={1}
                    className={`w-full [&_span]:bg-[#A97142] [&_div[role=slider]]:bg-[#A97142] [&_div[role=slider]]:border-[#A97142] [&_div[role=slider]]:ring-[#A97142] ${isClearing || isAuctionClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isClearing || isAuctionClosed}
                  />
                  <div className="flex justify-between text-xs text-[#4E3629]/50">
                    <span>1% (Very Unlikely)</span>
                    <span>99% (Almost Certain)</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-xs text-[#4E3629]/60 cursor-help">
                          <Info className="w-3 h-3" />
                          <span>What does this mean?</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md p-4">
                        <p className="text-sm mb-2 font-semibold">Your bid represents the percentage chance you assign to this outcome.</p>
                        <p className="text-sm">If you're right, each contract pays $1. If you're wrong, you lose your bid amount.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                    max={maxContracts}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter 1-100"
                    className={`border-[#4E3629]/30 focus-visible:ring-2 focus-visible:ring-[#A97142] text-lg px-4 py-3 rounded-lg ${isClearing || isAuctionClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isClearing || isAuctionClosed}
                  />
                  <p className="text-xs text-[#4E3629]/60">
                    Maximum {maxContracts} contracts per market
                  </p>
                </div>

                {/* Live Calculations */}
                {quantity && numQuantity > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-[#F9F5EF] to-[#FAF3E0] p-6 rounded-xl border-2 border-[#A97142]/30 space-y-3"
                  >
                    <h4 className="font-bold text-[#4E3629] flex items-center gap-2 mb-4">
                      <Info className="w-4 h-4" />
                      Live Projection
                    </h4>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#4E3629]/70 flex items-center gap-1">
                          📊 Estimated Cost:
                        </span>
                        <span className="text-xl font-bold text-[#4E3629]">${estimatedCost}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#4E3629]/70 flex items-center gap-1">
                          💰 Payout if Correct:
                        </span>
                        <span className="text-xl font-bold text-[#50C878]">${potentialPayout}</span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t-2 border-[#A97142]/20">
                        <span className="text-sm text-[#4E3629]/70 flex items-center gap-1">
                          📈 Projected Profit:
                        </span>
                        <span className={`text-xl font-bold ${parseFloat(projectedProfit) >= 0 ? 'text-[#50C878]' : 'text-[#B85750]'}`}>
                          {parseFloat(projectedProfit) >= 0 ? '+' : ''}${projectedProfit}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-[#4E3629]/50 flex items-center gap-1 cursor-help">
                                Expected Value: <Info className="w-3 h-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Mathematical expectation based on your confidence</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-sm font-semibold text-[#4E3629]/70">${expectedValue}</span>
                      </div>
                    </div>

                    {/* Warnings */}
                    {!hasEnoughBalance && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Insufficient funds</p>
                          <p className="text-xs text-red-600">Your balance: ${userBalance.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {!withinLimit && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-800">Exceeds contract limit</p>
                          <p className="text-xs text-orange-600">You can only buy up to {maxContracts} contracts per market</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitBid}
                  disabled={isSubmitting || isClearing || isAuctionClosed || !quantity || numQuantity === 0 || !hasEnoughBalance || !withinLimit}
                  className={`w-full py-6 text-lg font-bold rounded-xl shadow-lg transition-all duration-200 ${
                    selectedOutcome === 'yes'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  } disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed`}
                >
                  {isClearing ? 'Auction Clearing...' : isAuctionClosed ? 'Auction Closed' : isSubmitting ? 'Submitting...' : `Submit Bid for ${selectedOutcome.toUpperCase()}`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false })}>
        <DialogContent className="bg-white border-2 border-[#A97142] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#4E3629]">Confirm Trade</DialogTitle>
            <DialogDescription className="text-[#4E3629]/70">
              Review your bid before confirming
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-4">
            <div className="bg-gradient-to-br from-[#F9F5EF] to-[#FAF3E0] p-5 rounded-xl border border-[#A97142]/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#4E3629]/60 mb-1">Outcome:</p>
                  <Badge className={selectedOutcome === 'yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                    {selectedOutcome?.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-[#4E3629]/60 mb-1">Confidence:</p>
                  <p className="text-lg font-bold text-[#4E3629]">{probability}%</p>
                </div>
                <div>
                  <p className="text-[#4E3629]/60 mb-1">Contracts:</p>
                  <p className="text-lg font-bold text-[#4E3629]">{numQuantity}</p>
                </div>
                <div>
                  <p className="text-[#4E3629]/60 mb-1">Cost:</p>
                  <p className="text-lg font-bold text-[#4E3629]">${estimatedCost}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#A97142]/20">
                  <p className="text-[#4E3629]/60 mb-1">Potential Payout:</p>
                  <p className="text-2xl font-bold text-[#50C878]">${potentialPayout}</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-[#4E3629]/60 space-y-1 bg-blue-50 p-3 rounded-lg">
              <p>• Cost deducted immediately: ${estimatedCost}</p>
              <p>• If {selectedOutcome?.toUpperCase()} wins: +${projectedProfit}</p>
              <p>• If {selectedOutcome?.toUpperCase()} loses: -${estimatedCost}</p>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false })}
              className="border-[#4E3629]/30 text-[#4E3629] hover:bg-[#4E3629]/5"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBid}
              disabled={isSubmitting}
              className={selectedOutcome === 'yes'
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold'
              }
            >
              {isSubmitting ? 'Processing...' : 'Confirm Bid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
