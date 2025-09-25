import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ContactModal from "@/components/modals/contact-modal";
import CallNowModal from "@/components/call-now-modal";

export default function ClientAdminDashboard() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
  });

  const { data: analytics = {} } = useQuery({
    queryKey: ['/api/dashboard/analytics'],
  });

  const { data: contactStats = { total: 0, pending: 0, confirmed: 0 } } = useQuery({
    queryKey: ['/api/contacts/stats'],
  });

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

  return (
    <div className="p-6" data-testid="client-admin-dashboard">
      {/* Business Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-contacts">
                  {contactStats.total}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-address-book"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-up text-xs text-green-500 mr-1"></i>
              <span className="text-xs text-green-500 font-medium">+23</span>
              <span className="text-xs text-muted-foreground ml-1">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Calls This Week</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-calls-week">
                  {analytics.callsToday || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-chart-1/10 text-chart-1 rounded-lg flex items-center justify-center">
                <i className="fas fa-phone-alt"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-up text-xs text-green-500 mr-1"></i>
              <span className="text-xs text-green-500 font-medium">+8%</span>
              <span className="text-xs text-muted-foreground ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Appointments Confirmed</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-appointments-confirmed">
                  {contactStats.confirmed}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-check-circle"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-up text-xs text-green-500 mr-1"></i>
              <span className="text-xs text-green-500 font-medium">+3.2%</span>
              <span className="text-xs text-muted-foreground ml-1">improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Calls</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-pending-calls">
                  {contactStats.pending}
                </p>
              </div>
              <div className="w-10 h-10 bg-chart-2/10 text-chart-2 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock"></i>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <i className="fas fa-arrow-down text-xs text-green-500 mr-1"></i>
              <span className="text-xs text-green-500 font-medium">-2.1%</span>
              <span className="text-xs text-muted-foreground ml-1">improvement</span>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Call Performance</h3>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">This Week</Button>
                <Button variant="ghost" size="sm">Last Week</Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-check text-sm"></i>
                  </div>
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{analytics.successRate || 0}%</span>
                  <p className="text-xs text-green-500">Call conversion</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar-check text-sm"></i>
                  </div>
                  <span className="text-sm font-medium">Appointments Confirmed</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{analytics.appointmentsConfirmed || 0}</span>
                  <p className="text-xs text-blue-500">Total confirmed</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-sm"></i>
                  </div>
                  <span className="text-sm font-medium">No-Show Rate</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{analytics.noShowRate || 0}%</span>
                  <p className="text-xs text-yellow-500">Track reliability</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Today's Appointments</h3>
              <Button variant="ghost" size="sm">View Calendar</Button>
            </div>

            <div className="space-y-4">
              {contacts.filter((c: any) => c.appointmentTime && new Date(c.appointmentTime).toDateString() === new Date().toDateString()).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-calendar-alt text-4xl mb-4"></i>
                  <p className="text-lg font-medium">No appointments today</p>
                  <p className="text-sm">Schedule appointments to see them here</p>
                </div>
              ) : (
                contacts
                  .filter((c: any) => c.appointmentTime && new Date(c.appointmentTime).toDateString() === new Date().toDateString())
                  .map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{appointment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.appointmentType} - {appointment.appointmentDuration || 60} min
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          appointment.appointmentStatus === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className={`text-xs font-medium ${
                          appointment.appointmentStatus === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {appointment.appointmentStatus}
                        </span>
                      </div>
                    </div>
                  ))
              )}
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
