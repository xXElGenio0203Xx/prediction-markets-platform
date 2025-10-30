import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';

export default function TradeHistory() {
  const [filters, setFilters] = useState({
    outcome: '',
    side: '',
    start: '',
    end: '',
    limit: 50,
    offset: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['trade-history', filters],
    queryFn: () => api.getTradeHistory(filters),
  });

  const handleExport = async () => {
    try {
      await api.exportTrades();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handlePagination = (direction) => {
    setFilters(prev => ({
      ...prev,
      offset: direction === 'next' 
        ? prev.offset + prev.limit 
        : Math.max(0, prev.offset - prev.limit),
    }));
  };

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  const { trades = [], pagination, summary } = data || {};

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trade History</h1>
          <p className="text-muted-foreground">View and export your trading activity</p>
        </div>
        
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTrades}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                ${summary.totalFees.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                summary.totalPL >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                ${summary.totalPL.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={filters.outcome}
              onValueChange={(value) => handleFilterChange('outcome', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Outcomes</SelectItem>
                <SelectItem value="YES">YES</SelectItem>
                <SelectItem value="NO">NO</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.side}
              onValueChange={(value) => handleFilterChange('side', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sides</SelectItem>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Start Date"
              value={filters.start}
              onChange={(e) => handleFilterChange('start', e.target.value)}
            />

            <Input
              type="date"
              placeholder="End Date"
              value={filters.end}
              onChange={(e) => handleFilterChange('end', e.target.value)}
            />

            <Button
              variant="outline"
              onClick={() => setFilters({
                outcome: '',
                side: '',
                start: '',
                end: '',
                limit: 50,
                offset: 0,
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trade List */}
      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
          <CardDescription>
            Showing {pagination?.offset + 1} - {Math.min(pagination?.offset + pagination?.limit, pagination?.total)} of {pagination?.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trades found
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{trade.market.question}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(trade.timestamp).toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        trade.outcome === 'YES' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.outcome}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        trade.side === 'BUY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {trade.side}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-6 text-right">
                    <div>
                      <div className="text-xs text-muted-foreground">Price</div>
                      <div className="font-medium">${trade.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Quantity</div>
                      <div className="font-medium">{trade.quantity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Value</div>
                      <div className="font-medium">${trade.value.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">P&L</div>
                      <div className={`font-bold flex items-center justify-end gap-1 ${
                        trade.pl >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.pl >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        ${Math.abs(trade.pl).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => handlePagination('prev')}
                disabled={pagination.offset === 0}
              >
                Previous
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                {Math.ceil(pagination.total / pagination.limit)}
              </span>

              <Button
                variant="outline"
                onClick={() => handlePagination('next')}
                disabled={pagination.offset + pagination.limit >= pagination.total}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
