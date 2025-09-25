import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ContactModal from "@/components/modals/contact-modal";
import CallNowModal from "@/components/call-now-modal";
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
  Zap
} from "lucide-react";

export default function ClientAdminDashboard() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
  }) as { data: any[], isLoading: boolean };

  const { data: analytics = {} } = useQuery({
    queryKey: ['/api/dashboard/analytics'],
  }) as { data: any };

  const { data: contactStats = { total: 0, pending: 0, confirmed: 0 } } = useQuery({
    queryKey: ['/api/contacts/stats'],
  }) as { data: any };

  if (contactsLoading) {
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

  // Mock data for demonstration (in real app, this would come from API)
  const mockFailedCalls = [
    { id: '1', name: 'Sarah Johnson', phone: '+1234567890', reason: 'No answer', attempts: 3 },
    { id: '2', name: 'Mike Wilson', phone: '+1987654321', reason: 'Busy signal', attempts: 2 }
  ];

  const mockRecentActivity = [
    { type: 'call', contact: 'Ken Barnes', outcome: 'Confirmed', time: '10 mins ago' },
    { type: 'new_contact', contact: 'Alice Johnson', action: 'Added', time: '25 mins ago' },
    { type: 'appointment', contact: 'Bob Smith', outcome: 'Rescheduled', time: '1 hour ago' },
    { type: 'call', contact: 'Emma Davis', outcome: 'Voicemail', time: '2 hours ago' }
  ];

  return (
    <div className="p-6 space-y-6" data-testid="client-admin-dashboard">
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
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
            <div className="flex items-center mt-4">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-xs text-green-500 font-medium">{contactStats.confirmed} confirmed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
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
            <div className="flex items-center mt-4">
              <Clock className="w-4 h-4 text-orange-500 mr-1" />
              <span className="text-xs text-orange-500 font-medium">2 overdue</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Call Success Rate</p>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-success-rate">
                  {analytics.successRate || 85}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-xs text-green-500 font-medium">+2.3%</span>
              <span className="text-xs text-muted-foreground ml-1">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">No-Show Rate</p>
                <p className="text-3xl font-bold text-foreground" data-testid="metric-no-show-rate">
                  {analytics.noShowRate || 12}%
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-xs text-green-500 font-medium">-1.8%</span>
              <span className="text-xs text-muted-foreground ml-1">improvement</span>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" />
                  Failed Calls ({mockFailedCalls.length})
                </h4>
                <Badge variant="destructive">{mockFailedCalls.length}</Badge>
              </div>
              {mockFailedCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div>
                    <p className="text-sm font-medium">{call.name}</p>
                    <p className="text-xs text-muted-foreground">{call.phone} • {call.reason}</p>
                  </div>
                  <Badge variant="outline">{call.attempts} attempts</Badge>
                </div>
              ))}
            </div>

            {/* Unconfirmed Appointments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Unconfirmed (24h)
                </h4>
                <Badge variant="secondary">{contactStats.pending}</Badge>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium">{contactStats.pending} appointments need confirmation</p>
                <p className="text-xs text-muted-foreground">Scheduled within next 24 hours</p>
              </div>
            </div>

            {/* Missing Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Missing Information
                </h4>
                <Badge variant="outline">3</Badge>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium">3 contacts missing phone numbers</p>
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
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Next Appointments</h4>
                {todaysAppointments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">No appointments today</p>
                    <p className="text-xs">Schedule appointments to see them here</p>
                  </div>
                ) : (
                  todaysAppointments.slice(0, 3).map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
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
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Call Queue Priority</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">High Priority</p>
                      <p className="text-xs text-muted-foreground">Next 24 hours</p>
                    </div>
                    <Badge variant="destructive">2</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Standard</p>
                      <p className="text-xs text-muted-foreground">Next 3 days</p>
                    </div>
                    <Badge variant="secondary">{contactStats.pending - 2}</Badge>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockRecentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center border">
                    {activity.type === 'call' && <PhoneCall className="w-4 h-4" />}
                    {activity.type === 'new_contact' && <UserPlus className="w-4 h-4" />}
                    {activity.type === 'appointment' && <Calendar className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.contact}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'call' ? 'Call result: ' : activity.type === 'new_contact' ? 'Contact ' : 'Appointment '}
                      {activity.outcome || activity.action}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Performance Insights
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
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Appointment Confirmations</span>
                    <div className="flex items-center gap-2">
                      <Progress value={78} className="w-20 h-2" />
                      <span className="text-sm font-medium">78%</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Rate</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20 h-2" />
                      <span className="text-sm font-medium">92%</span>
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
                    <p className="text-xs text-green-600 dark:text-green-500">95% success</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">2:00 PM</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">88% success</p>
                  </div>
                </div>
              </div>

              {/* Contact Engagement */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Contact Engagement</h4>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Most Responsive</span>
                    <Badge variant="outline">85%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Healthcare appointments show highest engagement</p>
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
