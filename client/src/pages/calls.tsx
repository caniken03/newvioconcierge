import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  Phone, 
  PhoneCall, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  User
} from "lucide-react";

export default function CallManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [showCallDetails, setShowCallDetails] = useState(false);
  const [callToCancel, setCallToCancel] = useState<string | null>(null);

  // Handle URL parameters for filtering
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const statusParam = params.get('status');
    if (statusParam && ['scheduled', 'in_progress', 'completed', 'failed', 'recent'].includes(statusParam)) {
      if (statusParam === 'recent') {
        // For recent activity, show completed calls
        setStatusFilter('completed');
      } else {
        setStatusFilter(statusParam);
      }
    }
  }, [location]);

  // Fetch call sessions from API
  const { data: callSessions = [], isLoading: callSessionsLoading } = useQuery<any[]>({
    queryKey: ['/api/call-sessions'],
    enabled: !!user,
  });

  // Fetch call session stats from API  
  const { data: callStats = { active: 0, scheduled: 0, completed: 0, successRate: 0 }, isLoading: statsLoading } = useQuery<{
    active: number;
    scheduled: number; 
    completed: number;
    successRate: number;
  }>({
    queryKey: ['/api/call-sessions/stats'],
    enabled: !!user,
  });

  const initiateCallMutation = useMutation({
    mutationFn: async (callSessionId: string) => {
      return apiRequest('POST', `/api/call-sessions/${callSessionId}/start`, {});
    },
    onSuccess: () => {
      toast({
        title: "Call Started",
        description: "Voice call has been initiated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/call-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/call-sessions/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Call Failed", 
        description: error?.message || "Unable to start call. Please try again.",
        variant: "destructive",
      });
    }
  });

  const cancelCallMutation = useMutation({
    mutationFn: async (callSessionId: string) => {
      return apiRequest('PATCH', `/api/call-sessions/${callSessionId}`, { status: 'cancelled' });
    },
    onSuccess: () => {
      toast({
        title: "Call Cancelled",
        description: "Scheduled call has been cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/call-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/call-sessions/stats'] });
    },
    onError: () => {
      toast({
        title: "Cancellation Failed", 
        description: "Unable to cancel call. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      queued: "secondary",
      scheduled: "secondary",
      initiated: "default",
      in_progress: "default",
      active: "default",
      completed: "secondary",
      failed: "destructive",
      cancelled: "outline"
    };
    
    const labels = {
      queued: "Queued",
      scheduled: "Scheduled",
      initiated: "In Progress",
      in_progress: "In Progress",
      active: "In Progress",
      completed: "Completed", 
      failed: "Failed",
      cancelled: "Cancelled"
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const filteredCalls = callSessions.filter(call => {
    if (statusFilter !== "all" && call.status !== statusFilter) return false;
    if (searchTerm && !call.contactName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Use real data from API stats instead of filtering mock data
  const activeCallsCount = callStats.active || 0;
  const scheduledCallsCount = callStats.scheduled || 0;
  const completedCallsCount = callStats.completed || 0;
  const successRate = callStats.successRate || 0;

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="space-y-6" data-testid="call-management-page">
            
            {/* Call Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-green-200" 
                onClick={() => setStatusFilter("in_progress")}
                data-testid="active-calls-card"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{activeCallsCount}</div>
                  <p className="text-xs text-muted-foreground">Currently in progress</p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-blue-200" 
                onClick={() => setStatusFilter("scheduled")}
                data-testid="scheduled-calls-card"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{scheduledCallsCount}</div>
                  <p className="text-xs text-muted-foreground">Waiting to call</p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-green-200" 
                onClick={() => setStatusFilter("completed")}
                data-testid="completed-calls-card"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{completedCallsCount}</div>
                  <p className="text-xs text-muted-foreground">Successfully finished</p>
                </CardContent>
              </Card>
              
              <Card data-testid="success-rate-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{Math.round(successRate)}%</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Call Management Interface */}
            <Card data-testid="call-management-interface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Call Sessions
                </CardTitle>
                <CardDescription>
                  Monitor and manage voice appointment reminder calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search by contact name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-calls"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Call Sessions Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Appointment</TableHead>
                        <TableHead>Reminder Call</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call) => (
                        <TableRow key={call.id} data-testid={`call-row-${call.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              {call.contactName}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-xs">{call.contactPhone}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {call.appointmentDate 
                              ? new Date(call.appointmentDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'Not specified'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {call.reminderTime 
                              ? new Date(call.reminderTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : call.appointmentDate && call.callBeforeHours
                                ? new Date(new Date(call.appointmentDate).getTime() - call.callBeforeHours * 60 * 60 * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(call.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{call.attempts}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(call.status === "scheduled" || call.status === "queued") && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => initiateCallMutation.mutate(call.id)}
                                    disabled={initiateCallMutation.isPending}
                                    data-testid={`button-initiate-call-${call.id}`}
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    Start
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => setCallToCancel(call.id)}
                                    disabled={cancelCallMutation.isPending}
                                    data-testid={`button-cancel-call-${call.id}`}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              )}

                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedCall(call);
                                  setShowCallDetails(true);
                                }}
                                data-testid={`button-view-details-${call.id}`}
                              >
                                View Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredCalls.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground" data-testid="no-calls-message">
                      No calls found matching your criteria
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Call Details Dialog */}
      <Dialog open={showCallDetails} onOpenChange={setShowCallDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
            <DialogDescription>
              Complete information about this call session
            </DialogDescription>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedCall.contactName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-mono font-medium">{selectedCall.contactPhone}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Appointment Date & Time</p>
                    <p className="font-medium">
                      {selectedCall.appointmentDate 
                        ? new Date(selectedCall.appointmentDate).toLocaleString() 
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {selectedCall.appointmentDuration 
                        ? `${selectedCall.appointmentDuration} minutes` 
                        : 'Not specified'}
                    </p>
                  </div>
                  {selectedCall.appointmentType && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{selectedCall.appointmentType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Status Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Call Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCall.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attempts</p>
                    <p className="font-medium">{selectedCall.attempts}</p>
                  </div>
                  {selectedCall.callOutcome && (
                    <div>
                      <p className="text-sm text-muted-foreground">Outcome</p>
                      <p className="font-medium capitalize">{selectedCall.callOutcome.replace('_', ' ')}</p>
                    </div>
                  )}
                  {selectedCall.appointmentAction && (
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment Action</p>
                      <p className="font-medium capitalize">{selectedCall.appointmentAction.replace('_', ' ')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Completed At</p>
                    <p className="font-medium">
                      {selectedCall.completedAt 
                        ? new Date(selectedCall.completedAt).toLocaleString() 
                        : 'Not completed yet'}
                    </p>
                  </div>
                  {selectedCall.durationSeconds && (
                    <div>
                      <p className="text-sm text-muted-foreground">Call Duration</p>
                      <p className="font-medium">{Math.floor(selectedCall.durationSeconds / 60)}:{(selectedCall.durationSeconds % 60).toString().padStart(2, '0')} minutes</p>
                    </div>
                  )}
                </div>
              </div>


              {/* Notes and Instructions */}
              {(selectedCall.notes || selectedCall.specialInstructions) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Additional Information</h3>
                  {selectedCall.specialInstructions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Special Instructions</p>
                      <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedCall.specialInstructions}</p>
                    </div>
                  )}
                  {selectedCall.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedCall.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                {(selectedCall.status === "scheduled" || selectedCall.status === "queued") && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setCallToCancel(selectedCall.id);
                      setShowCallDetails(false);
                    }}
                    disabled={cancelCallMutation.isPending}
                    data-testid="button-cancel-call-dialog"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel This Call
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowCallDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!callToCancel} onOpenChange={(open) => !open && setCallToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Call?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled call? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Call</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (callToCancel) {
                  cancelCallMutation.mutate(callToCancel);
                  setCallToCancel(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Call
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}