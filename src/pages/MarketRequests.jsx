import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { 
  Check, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

export default function MarketRequestsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser.role !== 'ADMIN') {
          console.log('⚠️ MarketRequests: User is not admin, redirecting...');
          navigate('/Markets');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('❌ MarketRequests: Failed to fetch user:', error);
        navigate('/Login');
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadData();
    }
  }, [filter, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsData, statsData] = await Promise.all([
        api.getAllMarketRequests({ status: filter === 'ALL' ? undefined : filter }),
        api.getMarketRequestStats(),
      ]);
      setRequests(requestsData.requests || []);
      setStats(statsData.stats);
    } catch (error) {
      console.error('Error loading market requests:', error);
    }
    setIsLoading(false);
  };

  const handleReview = async (requestId, status) => {
    setIsReviewing(true);
    try {
      await api.reviewMarketRequest(requestId, status, adminNotes);
      setSelectedRequest(null);
      setAdminNotes('');
      await loadData();
    } catch (error) {
      console.error('Error reviewing request:', error);
      alert('Failed to review request: ' + error.message);
    }
    setIsReviewing(false);
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CREATED: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const statusIcons = {
    PENDING: Clock,
    APPROVED: CheckCircle,
    REJECTED: XCircle,
    CREATED: Check,
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Market Requests</h1>
        <p className="text-muted-foreground">Review and manage user-submitted market suggestions</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.created}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CREATED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="text-center py-12">Loading requests...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No requests found</h3>
            <p className="text-muted-foreground">No market requests with status: {filter}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const StatusIcon = statusIcons[request.status];
            return (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[request.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {request.status}
                        </Badge>
                        <Badge variant="outline">{request.category}</Badge>
                      </div>
                      <CardTitle className="text-xl mb-2">{request.title}</CardTitle>
                      {request.description && (
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      )}
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes('');
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Resolution Criteria:</p>
                    <p className="text-sm text-muted-foreground">{request.resolutionCriteria}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {request.requesterEmail || 'Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {request.reviewedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Reviewed {format(new Date(request.reviewedAt), 'MMM d')}
                        </span>
                      </div>
                    )}
                    {request.reviewer && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          By {request.reviewer.fullName || request.reviewer.email}
                        </span>
                      </div>
                    )}
                  </div>

                  {request.adminNotes && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Admin Notes:</p>
                          <p className="text-sm text-blue-800">{request.adminNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.createdMarket && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-1">Market Created:</p>
                      <p className="text-sm text-green-800">{request.createdMarket.question}</p>
                      <p className="text-xs text-green-600 mt-1">Slug: {request.createdMarket.slug}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Review Market Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{selectedRequest.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Resolution Criteria:</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.resolutionCriteria}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Admin Notes (optional):</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes('');
                  }}
                  disabled={isReviewing}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => handleReview(selectedRequest.id, 'REJECTED')}
                  disabled={isReviewing}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleReview(selectedRequest.id, 'APPROVED')}
                  disabled={isReviewing}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
