import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { 
  Phone, 
  PhoneCall, 
  Clock, 
  CheckCircle, 
  Search,
  Filter,
  User
} from "lucide-react";

export default function CallManagement() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [showCallDetails, setShowCallDetails] = useState(false);

  // Handle URL parameters for filtering
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const statusParam = params.get('status');
    if (statusParam && ['scheduled', 'in_progress', 'completed', 'failed', 'recent'].includes(statusParam)) {
      if (statusParam === 'recent') {
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

  const getStatusBadge = (status: string, callOutcome?: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      queued: "secondary",
      scheduled: "secondary",
      initiated: "default",
      in_progress: "default",
      active: "default",
      completed: "secondary",
      failed: "outline",
      cancelled: "outline",
      confirmed: "default",
      voicemail: "secondary",
      no_answer: "destructive",
      busy: "outline",
      rescheduled: "default"
    };
    
    const labels: Record<string, string> = {
      queued: "Queued",
      scheduled: "Scheduled",
      initiated: "Calling",
      in_progress: "Calling",
      active: "Calling",
      failed: "No Answer",
      cancelled: "Cancelled",
      confirmed: "Confirmed",
      voicemail: "Voicemail",
      no_answer: "No Answer",
      busy: "Busy",
      rescheduled: "Rescheduled"
    };

    // ALWAYS show the actual outcome instead of generic "completed" status
    let displayStatus = status;
    let displayVariant = variants[status] || "secondary";
    
    // If call is completed or failed, ALWAYS use the outcome (never show "Completed")
    if ((status === 'completed' || status === 'failed') && callOutcome) {
      displayStatus = callOutcome;
      displayVariant = variants[callOutcome] || variants[status] || "secondary";
    } else if (status === 'completed' && !callOutcome) {
      // If completed but no outcome, show "Ended" instead of "Completed"
      displayStatus = 'ended';
      labels['ended'] = 'Call Ended';
    }

    return (
      <Badge variant={displayVariant} className="whitespace-nowrap text-xs">
        {labels[displayStatus] || displayStatus}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return <span className="text-xs text-muted-foreground">-</span>;

    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      confirmed: "default",
      voicemail: "outline",
      no_answer: "destructive",
      busy: "outline",
      failed: "destructive"
    };

    const labels = {
      confirmed: "Confirmed",
      voicemail: "Voicemail",
      no_answer: "No Answer",
      busy: "Busy",
      failed: "No Answer"
    };

    return (
      <Badge variant={variants[outcome] || "outline"} className="text-xs">
        {labels[outcome as keyof typeof labels] || outcome}
      </Badge>
    );
  };

  const filteredCalls = callSessions.filter(call => {
    if (statusFilter !== "all" && call.status !== statusFilter) return false;
    if (searchTerm && !call.contactName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use real data from API stats
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
            
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Call Management</h1>
              <p className="text-muted-foreground">
                Monitor and manage AI-powered appointment reminder calls
              </p>
            </div>

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
                  <p className="text-xs text-muted-foreground">In progress right now</p>
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
                  <p className="text-xs text-muted-foreground">Queued to call</p>
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
                  <p className="text-xs text-muted-foreground">Calls finished</p>
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
                  Real-time monitoring of automated reminder calls
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
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Reminder Call Time</TableHead>
                        <TableHead className="text-xs text-muted-foreground">Appt Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Outcome</TableHead>
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
                              <span className="max-w-[150px] truncate">{call.contactName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{call.contactPhone}</TableCell>
                          <TableCell className="text-sm font-medium whitespace-nowrap">
                            {call.reminderTime 
                              ? new Date(call.reminderTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : call.appointmentDate && call.callBeforeHours
                                ? new Date(new Date(call.appointmentDate).getTime() - call.callBeforeHours * 60 * 60 * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {call.appointmentDate 
                              ? new Date(call.appointmentDate).toLocaleString(undefined, { month: 'short', day: 'numeric' })
                              : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(call.status, call.callOutcome)}</TableCell>
                          <TableCell>{getOutcomeBadge(call.callOutcome)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{call.attempts || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedCall(call);
                                setShowCallDetails(true);
                              }}
                              data-testid={`button-view-details-${call.id}`}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredCalls.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground" data-testid="no-calls-message">
                      No call sessions found matching your criteria
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
            <DialogTitle>Call Session Details</DialogTitle>
            <DialogDescription>
              Technical details and analytics for this call
            </DialogDescription>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact</h3>
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

              {/* Call Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Call Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedCall.status, selectedCall.callOutcome)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outcome</p>
                    <div className="mt-1">{getOutcomeBadge(selectedCall.callOutcome)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reminder Call Time</p>
                    <p className="font-medium">
                      {selectedCall.reminderTime 
                        ? new Date(selectedCall.reminderTime).toLocaleString()
                        : selectedCall.appointmentDate && selectedCall.callBeforeHours
                          ? new Date(new Date(selectedCall.appointmentDate).getTime() - selectedCall.callBeforeHours * 60 * 60 * 1000).toLocaleString()
                          : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Appointment Date</p>
                    <p className="font-medium">
                      {selectedCall.appointmentDate 
                        ? new Date(selectedCall.appointmentDate).toLocaleString()
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attempts</p>
                    <p className="font-medium">{selectedCall.attempts || 0}</p>
                  </div>
                </div>
              </div>

              {/* Timing */}
              {(selectedCall.startTime || selectedCall.endTime) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Timing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCall.startTime && (
                      <div>
                        <p className="text-sm text-muted-foreground">Started At</p>
                        <p className="font-medium">{new Date(selectedCall.startTime).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedCall.endTime && (
                      <div>
                        <p className="text-sm text-muted-foreground">Ended At</p>
                        <p className="font-medium">{new Date(selectedCall.endTime).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCall.retellCallId && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">System</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Retell Call ID</p>
                    <p className="font-mono text-sm">{selectedCall.retellCallId}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
