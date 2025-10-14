
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderRow = ({ order, maxQuantity, isAsk }) => {
  const percentage = (order.totalQuantity / maxQuantity) * 100;
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

export default function OrderBook({ orders, selectedOutcome, onUpdate }) {
  const aggregateOrders = (orders, side, outcome) => {
    const relevantOrders = orders.filter(o => o.status === 'open' && o.side === side && o.outcome === outcome);

    const aggregated = relevantOrders.reduce((acc, order) => {
        const key = `${order.price}`;
        
        if (!acc[key]) {
            acc[key] = {
                price: order.price,
                totalQuantity: 0,
            };
        }
        
        acc[key].totalQuantity += order.quantity - (order.filled_quantity || 0);
        
        return acc;
    }, {});
    
    return Object.values(aggregated).sort((a, b) => {
        return side === 'buy' ? b.price - a.price : a.price - b.price;
    });
  };

  const buyOrders = aggregateOrders(orders, 'buy', selectedOutcome);
  const sellOrders = aggregateOrders(orders, 'sell', selectedOutcome);

  const allOpenOrders = [...buyOrders, ...sellOrders];
  const maxQuantity = Math.max(...allOpenOrders.map(o => o.totalQuantity), 1);

  const bestBid = buyOrders.length > 0 ? buyOrders[0].price : 0;
  const bestAsk = sellOrders.length > 0 ? sellOrders[0].price : 1;
  const spread = bestAsk - bestBid > 0 ? bestAsk - bestBid : 0;

  // Listen for external updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate();
    }
  }, [orders, onUpdate]); // Added onUpdate to dependency array to satisfy ESLint hook dependency rules

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-[#4E3629]/10 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-[#4E3629]/5 bg-gradient-to-r from-[#FAF3E0] to-[#F5EED8]">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#4E3629]">
          <BookOpen className="w-5 h-5 text-[#A97142]" />
          Order Book
        </CardTitle>
        <p className="text-xs text-[#4E3629]/60 mt-1">Live orders for {selectedOutcome.toUpperCase()}</p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center text-xs font-bold text-[#4E3629]/50 pb-2 border-b border-[#4E3629]/10">
            <span>PRICE</span>
            <span>SIZE</span>
          </div>

          {/* Sell Orders (Asks) */}
          <div className="space-y-1">
            {sellOrders.length > 0 ? (
              sellOrders.slice(0, 5).map((order, index) => (
                <OrderRow key={`sell-${index}`} order={order} maxQuantity={maxQuantity} isAsk={true} />
              ))
            ) : (
              <p className="text-sm text-[#4E3629]/40 py-3 text-center">No sell orders</p>
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
          
          {/* Buy Orders (Bids) */}
          <div className="space-y-1">
            {buyOrders.length > 0 ? (
              buyOrders.slice(0, 5).map((order, index) => (
                <OrderRow key={`buy-${index}`} order={order} maxQuantity={maxQuantity} isAsk={false} />
              ))
            ) : (
              <p className="text-sm text-[#4E3629]/40 py-3 text-center">No buy orders</p>
            )}
          </div>

          {/* Stats */}
          <div className="pt-3 border-t border-[#4E3629]/10 text-xs text-[#4E3629]/50">
            <p>{allOpenOrders.length} open orders</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
