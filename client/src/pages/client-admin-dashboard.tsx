import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";

export default function ClientAdminDashboard() {
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

      {/* Contact Management Section */}
      <Card className="mb-8">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Contact Management</h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
                <Input
                  type="text"
                  placeholder="Search contacts..."
                  className="pl-10 pr-4 py-2 text-sm"
                  data-testid="input-search-contacts"
                />
              </div>
              <Button variant="secondary" data-testid="button-import-csv">
                <i className="fas fa-upload text-sm mr-2"></i>
                Import CSV
              </Button>
              <Link href="/contacts">
                <Button data-testid="button-add-contact">
                  <i className="fas fa-plus text-sm mr-2"></i>
                  Add Contact
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Checkbox />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Appointment
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Call
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="text-muted-foreground">
                      <i className="fas fa-address-book text-4xl mb-4"></i>
                      <p className="text-lg font-medium">No contacts found</p>
                      <p className="text-sm">Add your first contact to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.slice(0, 10).map((contact: any) => (
                  <tr key={contact.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-contact-${contact.id}`}>
                    <td className="px-6 py-4">
                      <Checkbox />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {contact.appointmentType && (
                          <p className="text-sm font-medium text-foreground">{contact.appointmentType}</p>
                        )}
                        {contact.appointmentTime && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(contact.appointmentTime).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={contact.appointmentStatus === 'confirmed' ? 'default' : 'secondary'}
                        className={
                          contact.appointmentStatus === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : contact.appointmentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {contact.appointmentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {contact.lastCallOutcome || 'Never called'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`button-call-contact-${contact.id}`}
                        >
                          <i className="fas fa-phone text-sm"></i>
                        </button>
                        <button
                          className="text-muted-foreground hover:text-primary transition-colors"
                          data-testid={`button-edit-contact-${contact.id}`}
                        >
                          <i className="fas fa-edit text-sm"></i>
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {contacts.length > 0 && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing 1-{Math.min(10, contacts.length)} of {contacts.length} contacts
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="default" size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

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
                  <span className="text-sm font-medium">Successful Calls</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">0</span>
                  <p className="text-xs text-green-500">+0%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-voicemail text-sm"></i>
                  </div>
                  <span className="text-sm font-medium">Voicemail</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">0</span>
                  <p className="text-xs text-yellow-500">+0%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-times text-sm"></i>
                  </div>
                  <span className="text-sm font-medium">No Answer</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">0</span>
                  <p className="text-xs text-red-500">+0%</p>
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
    </div>
  );
}
