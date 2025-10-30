import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";

export default function FeesTile() {
  const { data, isLoading } = useQuery({
    queryKey: ["fees-summary"],
    queryFn: async () => {
      return await api.getFeesSummary();
    },
  });

  return (
    <Card className="bg-white border-2 border-amber-300 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-amber-600" />
          Platform Fees
          {data?.asOf && <Badge variant="outline" className="ml-2">{new Date(data.asOf).toLocaleDateString()}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-gray-500">Today</div>
          <div className="text-xl font-bold text-gray-900">${Number(data?.today || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">MTD</div>
          <div className="text-xl font-bold text-gray-900">${Number(data?.mtd || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">YTD</div>
          <div className="text-xl font-bold text-gray-900">${Number(data?.ytd || 0).toFixed(2)}</div>
        </div>
      </CardContent>
    </Card>
  );
}