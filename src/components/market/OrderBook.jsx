
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

// New helpers for CLOB
function deriveAsksFromNoBids(orders) {
  const noBids = orders.filter(o => o.side === 'NO_BID' && (o.qty_open || 0) > 0);
  const map = new Map();
  for (const o of noBids) {
    const askP = Math.round((1 - Number(o.price)) * 100) / 100;
    const key = askP.toFixed(2);
    map.set(key, (map.get(key) || 0) + Number(o.qty_open || 0));
  }
  return Array.from(map.entries()).map(([price, totalQuantity]) => ({ price: Number(price), totalQuantity }))
    .sort((a, b) => a.price - b.price);
}

function deriveYesBids(orders) {
  const yesBids = orders.filter(o => o.side === 'YES_BID' && (o.qty_open || 0) > 0);
  const map = new Map();
  for (const o of yesBids) {
    const p = Math.round(Number(o.price) * 100) / 100;
    const key = p.toFixed(2);
    map.set(key, (map.get(key) || 0) + Number(o.qty_open || 0));
  }
  return Array.from(map.entries()).map(([price, totalQuantity]) => ({ price: Number(price), totalQuantity }))
    .sort((a, b) => b.price - a.price);
}

const OrderRow = ({ order, maxQuantity, isAsk }) => {
  const percentage = maxQuantity ? (order.totalQuantity / maxQuantity) * 100 : 0;
  return (
    <div className="relative flex items-center justify-between text-sm py-2.5 px-3 rounded-lg hover:bg-[#4E3629]/5 transition-colors">
      <motion.div
        className={`absolute h-full ${isAsk ? 'bg-[#E34234]/8 right-0' : 'bg-[#50C878]/8 left-0'} rounded-lg`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5 }}
      />
      <div className="z-10 flex items-center gap-3">
        <span className={`font-mono font-bold ${isAsk ? 'text-[#E34234]' : 'text-[#50C878]'} text-base`}>
          ${order.price.toFixed(2)}
        </span>
      </div>
      <span className="z-10 text-[#4E3629] font-semibold">{order.totalQuantity.toLocaleString()}</span>
    </div>
  );
};

export default function OrderBook({ orders }) {
  const asks = deriveAsksFromNoBids(orders || []);
  const bids = deriveYesBids(orders || []);
  const all = [...asks, ...bids];
  const maxQuantity = all.length ? Math.max(...all.map(o => o.totalQuantity)) : 1;
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 1;
  const spread = Math.max(0, bestAsk - bestBid);

  useEffect(() => {
    // This useEffect is kept as a placeholder as per the outline.
    // If no specific side effects are needed for 'orders' updates, it can be removed.
  }, [orders]);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-[#4E3629]/5 bg-gradient-to-r from-[#FAF3E0] to-[#F5EED8]">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#4E3629]">
          <BookOpen className="w-5 h-5 text-[#A97142]" />
          Order Book (YES)
        </CardTitle>
        <p className="text-xs text-[#4E3629]/60 mt-1">YES bids vs. derived YES asks (from NO bids)</p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-[#4E3629]/50 pb-2 border-b border-[#4E3629]/10">
            <span>PRICE</span>
            <span>SIZE</span>
          </div>

          {/* Asks */}
          <div className="space-y-1">
            {asks.length > 0 ? (
              asks.slice(0, 5).map((order, index) => (
                <OrderRow key={`ask-${index}`} order={order} maxQuantity={maxQuantity} isAsk={true} />
              ))
            ) : (
              <p className="text-sm text-[#4E3629]/40 py-3 text-center">No asks</p>
            )}
          </div>

          {/* Spread */}
          <div className="py-3 text-center border-y-2 border-[#A97142]/20 bg-gradient-to-r from-[#A97142]/5 to-[#50C878]/5 rounded-lg">
            <div className="text-base font-bold text-[#4E3629]">
              ${bestBid.toFixed(2)} / ${bestAsk.toFixed(2)}
            </div>
            <div className="text-xs text-[#4E3629]/60 mt-1">
              Spread: ${spread.toFixed(2)}
            </div>
          </div>

          {/* Bids */}
          <div className="space-y-1">
            {bids.length > 0 ? (
              bids.slice(0, 5).map((order, index) => (
                <OrderRow key={`bid-${index}`} order={order} maxQuantity={maxQuantity} isAsk={false} />
              ))
            ) : (
              <p className="text-sm text-[#4E3629]/40 py-3 text-center">No bids</p>
            )}
          </div>

          <div className="pt-3 border-t border-[#4E3629]/10 text-xs text-[#4E3629]/50">
            <p>{(asks.length + bids.length)} levels shown</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
