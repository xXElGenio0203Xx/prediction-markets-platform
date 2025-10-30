import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Info, Calendar, Target } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function MarketDetails({ market }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const daysUntilResolution = differenceInDays(new Date(market.resolution_date), new Date());
  const progressPercent = Math.max(0, Math.min(100, 100 - (daysUntilResolution / 30) * 100));

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#4E3629]/5 rounded-none"
        >
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-[#A97142]" />
            <span className="font-semibold text-[#4E3629]">Market Information</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#4E3629]/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#4E3629]/60" />
          )}
        </Button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 space-y-6 border-t border-[#4E3629]/10">
                <div className="pt-6">
                  <h3 className="font-semibold text-[#4E3629] mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#A97142]" />
                    Description
                  </h3>
                  <p className="text-[#4E3629]/70 leading-relaxed">{market.description}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-[#4E3629] mb-3">Resolution Criteria</h3>
                  <div className="bg-[#A97142]/10 p-4 rounded-xl border-2 border-[#A97142]/20">
                    <p className="text-[#4E3629] text-sm leading-relaxed">{market.resolution_criteria}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[#4E3629] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#A97142]" />
                      Time Remaining
                    </h3>
                    <span className="text-sm font-semibold text-[#4E3629]">
                      {daysUntilResolution} days
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-3 bg-[#4E3629]/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute h-full bg-gradient-to-r from-[#A97142] to-[#50C878] rounded-full"
                    />
                  </div>
                  
                  <p className="text-xs text-[#4E3629]/50 mt-2">
                    Ends {formatDistanceToNow(new Date(market.resolution_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}