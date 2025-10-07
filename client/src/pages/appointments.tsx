import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Calendar, Clock, User, Search, CheckCircle, XCircle, AlertCircle, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

interface Appointment {
  id: string;
  contactName: string;
  contactPhone: string;
  appointmentTime: string;
  appointmentType?: string;
  status: string;
  notes?: string;
  lastCallOutcome?: string;
  callAttempts?: number;
}

export default function Appointments() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Handle URL parameters for filtering
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const statusParam = params.get('status');
    const searchParam = params.get('search');
    
    if (statusParam && ['confirmed', 'pending', 'completed', 'cancelled', 'no_show', 'today'].includes(statusParam)) {
      if (statusParam === 'today') {
        setStatusFilter('today');
      } else {
        setStatusFilter(statusParam);
      }
    }
    
    if (searchParam) {
      const decodedSearch = decodeURIComponent(searchParam);
      setSearchQuery(decodedSearch);
    }
  }, [location]);

  // Fetch appointments data
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
  }) as { data: Appointment[], isLoading: boolean };

  // Filter and sort appointments
  const filteredAppointments = appointments
    .filter(appointment => {
      const matchesSearch = appointment.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           appointment.contactPhone.includes(searchQuery);
      
      // Handle status filtering including special 'today' filter
      let matchesStatus = true;
      if (statusFilter === "today") {
        const today = new Date().toDateString();
        const appointmentDate = new Date(appointment.appointmentTime).toDateString();
        matchesStatus = appointmentDate === today;
      } else if (statusFilter !== "all") {
        matchesStatus = appointment.status === statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime();
      }
      return a.contactName.localeCompare(b.contactName);
    });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: "Confirmed", variant: "default" as const },
      pending: { label: "Pending", variant: "secondary" as const },
      completed: { label: "Completed", variant: "outline" as const },
      cancelled: { label: "Cancelled", variant: "destructive" as const },
      no_show: { label: "No Show", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLastCallIndicator = (outcome?: string) => {
    if (!outcome) return null;

    const indicators = {
      confirmed: { icon: CheckCircle, label: "Confirmed", color: "text-green-600" },
      voicemail: { icon: PhoneOff, label: "Voicemail", color: "text-yellow-600" },
      no_answer: { icon: XCircle, label: "No answer", color: "text-red-600" },
      busy: { icon: AlertCircle, label: "Busy", color: "text-orange-600" },
      failed: { icon: XCircle, label: "Failed", color: "text-red-600" },
    };

    const indicator = indicators[outcome as keyof typeof indicators];
    if (!indicator) return null;

    const Icon = indicator.icon;
    return (
      <div className={`flex items-center gap-1 text-xs ${indicator.color}`}>
        <Icon className="h-3 w-3" />
        <span>Last call: {indicator.label}</span>
      </div>
    );
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  // Calculate stats
  const stats = {
    total: appointments.length,
    today: appointments.filter(apt => {
      const today = new Date().toDateString();
      return new Date(apt.appointmentTime).toDateString() === today;
    }).length,
    confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
    pending: appointments.filter(apt => apt.status === 'pending').length
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
                <p className="text-muted-foreground">
                  Manage your scheduled appointments and client bookings
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-blue-200" 
                onClick={() => setStatusFilter("all")}
                data-testid="stats-card-total"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All scheduled</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-orange-200" 
                onClick={() => setStatusFilter("today")}
                data-testid="stats-card-today"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.today}</div>
                  <p className="text-xs text-muted-foreground">Due today</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-green-200" 
                onClick={() => setStatusFilter("confirmed")}
                data-testid="stats-card-confirmed"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.confirmed}</div>
                  <p className="text-xs text-muted-foreground">Ready to go</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-yellow-200" 
                onClick={() => setStatusFilter("pending")}
                data-testid="stats-card-pending"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Confirmation</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by contact name or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-appointment-search"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="today">Today's Appointments</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-by">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date & Time</SelectItem>
                      <SelectItem value="name">Contact Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Appointments List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Scheduled Appointments ({filteredAppointments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">No appointments found</p>
                    <p className="text-sm">
                      {searchQuery || statusFilter !== "all" 
                        ? "Try adjusting your filters to see more results"
                        : "Your appointments will appear here once scheduled"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3" data-testid="appointments-list">
                    {filteredAppointments.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.appointmentTime);
                      return (
                        <div 
                          key={appointment.id} 
                          className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                          data-testid={`appointment-${appointment.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-base" data-testid={`appointment-name-${appointment.id}`}>
                                      {appointment.contactName}
                                    </h3>
                                    {getStatusBadge(appointment.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground" data-testid={`appointment-phone-${appointment.id}`}>
                                    {appointment.contactPhone}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm ml-13">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium" data-testid={`appointment-date-${appointment.id}`}>{date}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium" data-testid={`appointment-time-${appointment.id}`}>{time}</span>
                                </div>
                                {appointment.appointmentType && (
                                  <Badge variant="outline" className="text-xs">
                                    {appointment.appointmentType}
                                  </Badge>
                                )}
                              </div>

                              {appointment.lastCallOutcome && (
                                <div className="ml-13">
                                  {getLastCallIndicator(appointment.lastCallOutcome)}
                                </div>
                              )}

                              {appointment.notes && (
                                <>
                                  <Separator className="ml-13" />
                                  <div className="text-sm text-muted-foreground ml-13">
                                    <strong>Notes:</strong> {appointment.notes}
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm" data-testid={`button-reschedule-${appointment.id}`}>
                                Reschedule
                              </Button>
                              <Button variant="outline" size="sm" data-testid={`button-edit-${appointment.id}`}>
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
