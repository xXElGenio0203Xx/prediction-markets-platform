import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function UserPositions({ userOrders = [] }) {
  const openOrders = userOrders.filter(order => order.status === 'open');
  const filledOrders = userOrders.filter(order => order.status === 'filled');

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="w-5 h-5 text-amber-600" />
          My Orders
        </CardTitle>
        <div className="flex gap-2">
          <Badge className="bg-blue-100 text-blue-800 text-xs">
            {openOrders.length} Open
          </Badge>
          <Badge className="bg-gray-100 text-gray-800 text-xs">
            {filledOrders.length} Filled
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {userOrders.length > 0 ? (
          <div className="space-y-3">
            {userOrders.slice(0, 10).map((order, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {order.status === 'open' ? (
                      <Clock className="w-4 h-4 text-blue-500" />
                    ) : order.status === 'filled' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-semibold ${
                      order.side === 'buy' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {order.side.toUpperCase()}
                    </span>
                  </div>
                  
                  <Badge className={`text-xs ${
                    order.outcome === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {order.outcome.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="text-right text-sm">
                  <p className="font-semibold">{order.quantity} @ ${order.price.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs capitalize">{order.status}</p>
                </div>
              </div>
            ))}
            
            {userOrders.length > 10 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                Showing 10 of {userOrders.length} orders
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders placed yet</p>
            <p className="text-sm text-gray-400">Place your first limit order to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}