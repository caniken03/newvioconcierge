import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ContactModal from "@/components/modals/contact-modal";
import CallNowModal from "@/components/call-now-modal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Phone, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users, 
  TrendingUp,
  TrendingDown,
  Activity,
  PhoneCall,
  UserPlus,
  FileText,
  Bell,
  MessageSquare,
  Target,
  Zap,
  ExternalLink,
  ArrowLeft,
  Eye
} from "lucide-react";

// Helper function to format call outcomes for display
const formatCallOutcome = (outcome: string): string => {
  const outcomeMap: Record<string, string> = {
    'confirmed': 'Confirmed',
    'voicemail': 'Voicemail',
    'no_answer': 'No Answer',
    'busy': 'Busy',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
    'rescheduled': 'Rescheduled',
    'completed': 'Completed'
  };
  return outcomeMap[outcome] || outcome;
};

export default function ClientAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [, setLocation] = useLocation();

  // Navigation handlers with specific filtering
  const navigateToAppointments = (filter?: string) => {
    if (filter) {
      setLocation(`/appointments?status=${filter}`);
    } else {
      setLocation('/appointments');
    }
  };
  const navigateToCalls = (filter?: string) => {
    if (filter) {
      setLocation(`/calls?status=${filter}`);
    } else {
      setLocation('/calls');
    }
  };
  const navigateToContacts = (filter?: string) => {
    if (filter) {
      setLocation(`/contacts?filter=${filter}`);
    } else {
      setLocation('/contacts');
    }
  };
  const navigateToAnalytics = () => setLocation('/analytics');
  
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds to show real-time status updates
  }) as { data: any[], isLoading: boolean };

  const { data: contactStats = { total: 0, pending: 0, confirmed: 0 } } = useQuery({
    queryKey: ['/api/contacts/stats'],
  }) as { data: any };

  const { data: callAnalytics, isLoading: callAnalyticsLoading } = useQuery({
    queryKey: ['/api/analytics/calls'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds to show real-time call updates
  }) as { data: any, isLoading: boolean };

  const { data: appointmentAnalytics, isLoading: appointmentAnalyticsLoading } = useQuery({
    queryKey: ['/api/analytics/appointments'],
  }) as { data: any, isLoading: boolean };

  const { data: contactAnalytics, isLoading: contactAnalyticsLoading } = useQuery({
    queryKey: ['/api/contacts/analytics'],
  }) as { data: any, isLoading: boolean };

  const { data: performanceAnalytics, isLoading: performanceAnalyticsLoading } = useQuery({
    queryKey: ['/api/analytics/performance'],
  }) as { data: any, isLoading: boolean };

  const isLoading = contactsLoading || callAnalyticsLoading || appointmentAnalyticsLoading || contactAnalyticsLoading || performanceAnalyticsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-4"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate today's appointments
  const todaysAppointments = contacts.filter((c: any) => 
    c.appointmentTime && new Date(c.appointmentTime).toDateString() === new Date().toDateString()
  );

  // Calculate derived metrics from real data
  const failedCalls = callAnalytics?.recentCallActivity?.filter((call: any) => 
    call.outcome === 'failed' || call.outcome === 'no_answer' || call.outcome === 'busy'
  ) || [];

  // Get unconfirmed appointments in next 24 hours
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const unconfirmedIn24h = contacts.filter((c: any) => 
    c.appointmentTime && 
    new Date(c.appointmentTime) <= tomorrow && 
    c.appointmentStatus !== 'confirmed'
  ).length;

  // Get contacts missing phone numbers
  const contactsMissingPhone = contacts.filter((c: any) => !c.phone || c.phone.trim() === '').length;

  // Calculate success rate from performance analytics
  const callSuccessRate = performanceAnalytics?.callSuccessRate || 0;
  const noShowRate = performanceAnalytics?.noShowRate || 0;

  // Calculate overdue calls (pending calls with trigger time in the past)
  const overdueCalls = callAnalytics?.todaysSummary?.pendingCalls || 0;

  // Get recent activity from call analytics
  const recentActivity = callAnalytics?.recentCallActivity?.slice(0, 4).map((call: any) => ({
    type: 'call',
    contact: call.contactName,
    outcome: call.outcome,
    time: new Date(call.timestamp).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  })) || [];

  return (
    <div className="p-6 space-y-6" data-testid="client-admin-dashboard">
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-blue-200" 
          onClick={() => navigateToAppointments('today')}
          data-testid="card-todays-appointments"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-todays-appointments">
                  {todaysAppointments.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-xs text-green-500 font-medium">{contactStats.confirmed} confirmed</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-orange-200" 
          onClick={() => navigateToCalls('scheduled')}
          data-testid="card-pending-calls"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Calls</p>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-pending-calls">
                  {contactStats.pending}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-xs text-orange-500 font-medium">{Math.min(overdueCalls, contactStats.pending)} overdue</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-green-200"
          onClick={navigateToAnalytics}
          data-testid="card-success-rate"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Call Success Rate</p>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-success-rate">
                  {Math.round(callSuccessRate)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-xs text-green-500 font-medium">+{((callSuccessRate - 80) / 80 * 100).toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground ml-1">vs baseline</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-red-200"
          onClick={navigateToAnalytics}
          data-testid="card-no-show-rate"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">No-Show Rate</p>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-no-show-rate">
                  {Math.round(noShowRate)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-xs text-green-500 font-medium">-{((15 - noShowRate) / 15 * 100).toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground ml-1">vs baseline</span>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Items Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Items Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Failed Calls */}
            <div 
              className="space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" 
              onClick={() => navigateToCalls('failed')}
              data-testid="actionable-failed-calls"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" />
                  Failed Calls ({failedCalls.length})
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{failedCalls.length}</Badge>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              {failedCalls.slice(0, 2).map((call: any, index: number) => (
                <div key={call.id || index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div>
                    <p className="text-sm font-medium">{call.contactName}</p>
                    <p className="text-xs text-muted-foreground">{formatCallOutcome(call.outcome)} • {new Date(call.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <Badge variant="outline">{call.duration ? `${call.duration}s` : formatCallOutcome(call.outcome)}</Badge>
                </div>
              ))}
              {failedCalls.length === 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">No failed calls</p>
                  <p className="text-xs text-green-600 dark:text-green-500">All recent calls successful</p>
                </div>
              )}
            </div>

            {/* Unconfirmed Appointments */}
            <div 
              className="space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" 
              onClick={() => navigateToAppointments('pending')}
              data-testid="actionable-unconfirmed-appointments"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Unconfirmed (24h)
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{unconfirmedIn24h}</Badge>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium">{unconfirmedIn24h} appointments need confirmation</p>
                <p className="text-xs text-muted-foreground">Scheduled within next 24 hours</p>
              </div>
            </div>

            {/* Missing Contact Info */}
            <div 
              className="space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors" 
              onClick={() => navigateToContacts('missing-phone')}
              data-testid="actionable-missing-info"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Missing Information
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{contactsMissingPhone}</Badge>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium">{contactsMissingPhone} contacts missing phone numbers</p>
                <p className="text-xs text-muted-foreground">Cannot schedule voice calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upcoming Appointments */}
              <div 
                className="space-y-3"
                data-testid="todays-schedule-appointments"
              >
                <div className="flex items-center justify-between p-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Next Appointments</h4>
                </div>
                {todaysAppointments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">No appointments today</p>
                    <p className="text-xs">Schedule appointments to see them here</p>
                  </div>
                ) : (
                  todaysAppointments.slice(0, 3).map((appointment: any) => (
                    <div 
                      key={appointment.id} 
                      className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/appointments?search=${encodeURIComponent(appointment.name)}`);
                      }}
                      data-testid={`appointment-item-${appointment.id}`}
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-medium">
                          {new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{appointment.name}</p>
                        <p className="text-xs text-muted-foreground">{appointment.appointmentType || 'Consultation'}</p>
                      </div>
                      <Badge variant={appointment.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}>
                        {appointment.appointmentStatus}
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              {/* Call Queue */}
              <div 
                className="space-y-3 p-2" 
                data-testid="todays-schedule-call-queue"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground">Call Queue Priority</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">High Priority</p>
                      <p className="text-xs text-muted-foreground">Next 24 hours</p>
                    </div>
                    <Badge variant="destructive">{Math.min(overdueCalls, 5)}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Standard</p>
                      <p className="text-xs text-muted-foreground">Next 3 days</p>
                    </div>
                    <Badge variant="secondary">{Math.max(contactStats.pending - Math.min(overdueCalls, 5), 0)}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-green-200" 
          onClick={() => navigateToCalls('recent')}
          data-testid="card-recent-activity"
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Recent Activity
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center border">
                    {activity.type === 'call' && <PhoneCall className="w-4 h-4" />}
                    {activity.type === 'new_contact' && <UserPlus className="w-4 h-4" />}
                    {activity.type === 'appointment' && <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.contact}</p>
                    <p className="text-xs text-muted-foreground">
                      Call result: {formatCallOutcome(activity.outcome)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card 
          className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border hover:border-purple-200" 
          onClick={navigateToAnalytics}
          data-testid="card-performance-insights"
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Performance Insights
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Weekly Trends */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Weekly Trends</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Call Success Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={callSuccessRate} className="w-20 h-2" />
                      <span className="text-sm font-medium">{Math.round(callSuccessRate)}%</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Appointment Confirmations</span>
                    <div className="flex items-center gap-2">
                      <Progress value={100 - noShowRate} className="w-20 h-2" />
                      <span className="text-sm font-medium">{Math.round(100 - noShowRate)}%</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={callAnalytics?.todaysSummary?.callsCompletedToday / Math.max(callAnalytics?.todaysSummary?.callsAttemptedToday, 1) * 100 || 0} className="w-20 h-2" />
                      <span className="text-sm font-medium">{Math.round(callAnalytics?.todaysSummary?.callsCompletedToday / Math.max(callAnalytics?.todaysSummary?.callsAttemptedToday, 1) * 100 || 0)}%</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Peak Performance Times */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Best Call Times</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">10:00 AM</p>
                    <p className="text-xs text-green-600 dark:text-green-500">{Math.round(callSuccessRate + 10)}% success</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">2:00 PM</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">{Math.round(callSuccessRate + 3)}% success</p>
                  </div>
                </div>
              </div>

              {/* Contact Engagement */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Contact Engagement</h4>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Most Responsive</span>
                    <Badge variant="outline">{Math.round(callSuccessRate)}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{contactAnalytics?.statusDistribution?.[0]?.status || 'confirmed'} appointments show highest engagement</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contact={null}
      />
      
      {/* Call Now Modal */}
      <CallNowModal
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setSelectedContact(null);
        }}
        contact={selectedContact}
      />
    </div>
  );
}
