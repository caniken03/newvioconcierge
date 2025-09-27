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
    mutationFn: async (contactId: string) => {
      return apiRequest(`/api/calls/initiate`, 'POST', { contactId });
    },
    onSuccess: () => {
      toast({
        title: "Call Initiated",
        description: "Voice call has been started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    },
    onError: () => {
      toast({
        title: "Call Failed", 
        description: "Unable to initiate call. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      scheduled: "secondary",
      in_progress: "default", 
      completed: "secondary",
      failed: "destructive",
      cancelled: "outline"
    };
    
    const labels = {
      scheduled: "Scheduled",
      in_progress: "In Progress",
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
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled For</TableHead>
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
                          <TableCell className="font-mono text-sm">{call.contactPhone}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{new Date(call.appointmentDate).toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(call.status)}</TableCell>
                          <TableCell className="text-sm">
                            {call.scheduledFor ? new Date(call.scheduledFor).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{call.attempts}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {call.status === "scheduled" && (
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
                              )}
                              {call.status === "in_progress" && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  data-testid={`button-pause-call-${call.id}`}
                                >
                                  <Pause className="w-4 h-4 mr-1" />
                                  Pause
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" data-testid={`button-call-details-${call.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
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
    </div>
  );
}