import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  User, 
  Phone, 
  Settings, 
  Users, 
  Shield, 
  Database,
  MapPin,
  Clock,
  Bell,
  Key,
  Globe,
  Mail,
  Smartphone
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  
  if (!user) return null;

  const profileSections = [
    {
      id: "business",
      title: "Business Information",
      description: "Manage your business details and branding",
      icon: Building,
      accessLevel: "client_admin_only"
    },
    {
      id: "account",
      title: "User Account Settings", 
      description: "Personal account preferences and security",
      icon: User,
      accessLevel: "all_users"
    },
    {
      id: "calls",
      title: "Call Settings & Preferences",
      description: "Configure voice calling behavior and timing",
      icon: Phone,
      accessLevel: "client_admin_only"
    },
    {
      id: "integrations",
      title: "Calendar & Integration Settings",
      description: "Manage Cal.com, Calendly, and other integrations",
      icon: Settings,
      accessLevel: "client_admin_only"
    },
    {
      id: "team",
      title: "Team & User Management",
      description: "Manage staff access and permissions",
      icon: Users,
      accessLevel: "client_admin_only"
    },
    {
      id: "privacy",
      title: "Privacy & Compliance",
      description: "HIPAA settings, data retention, and privacy controls",
      icon: Shield,
      accessLevel: "client_admin_only"
    },
    {
      id: "data",
      title: "Data & Export Controls",
      description: "Export data, backup settings, and data portability",
      icon: Database,
      accessLevel: "client_admin_only"
    }
  ];

  const accessibleSections = profileSections.filter(section => 
    section.accessLevel === "all_users" || user.role === "client_admin" || user.role === "super_admin"
  );

  // Set initial tab to first accessible section for the user's role
  const [activeTab, setActiveTab] = useState(accessibleSections[0]?.id || "account");

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="profile-page">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, business information, and system preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full lg:w-auto lg:grid-cols-none lg:flex grid-cols-${accessibleSections.length}`}>
          {accessibleSections.map((section) => {
            const IconComponent = section.icon;
            return (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid={`tab-${section.id}`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{section.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Render only accessible sections based on user role */}
        {accessibleSections.map((section) => {
          if (section.id === "business") {
            return (
              <TabsContent key="business" value="business" className="space-y-6">
          <Card data-testid="business-profile-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Manage your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Business Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-legal-name">Legal Business Name *</Label>
                    <Input 
                      id="company-legal-name"
                      placeholder="Enter your legal business name"
                      data-testid="input-company-legal-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Official legal name of your business
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trading-name">Trading Name / DBA</Label>
                    <Input 
                      id="trading-name"
                      placeholder="The name the system will read out during calls (e.g., 'City Dental Clinic')"
                      data-testid="input-trading-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the name customers will hear during voice calls
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website-url">Business Website</Label>
                    <Input 
                      id="website-url"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      data-testid="input-website-url"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Primary Business Phone *</Label>
                    <Input 
                      id="business-phone"
                      type="tel"
                      placeholder="+44 20 7123 4567"
                      data-testid="input-business-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-email">Business Email *</Label>
                    <Input 
                      id="business-email"
                      type="email"
                      placeholder="info@yourbusiness.com"
                      data-testid="input-business-email"
                    />
                  </div>
                </div>
              </div>


              <div className="flex justify-end pt-4">
                <Button data-testid="button-save-business-profile">
                  Save Business Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          if (section.id === "account") {
            return (
              <TabsContent key="account" value="account" className="space-y-6">
          <Card data-testid="user-account-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Account Settings
              </CardTitle>
              <CardDescription>
                Manage your personal information, security settings, and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name *</Label>
                    <Input 
                      id="full-name"
                      defaultValue={user.fullName}
                      data-testid="input-full-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input 
                      id="email"
                      type="email"
                      defaultValue={user.email}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-title">Job Title / Role</Label>
                    <Input 
                      id="job-title"
                      placeholder="e.g., Practice Manager, Salon Owner"
                      data-testid="input-job-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-phone">Personal Phone</Label>
                    <Input 
                      id="personal-phone"
                      type="tel"
                      placeholder="+44 7123 456789"
                      data-testid="input-personal-phone"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Security Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input 
                      id="current-password"
                      type="password"
                      placeholder="Enter current password"
                      data-testid="input-current-password"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input 
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        data-testid="input-new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input 
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        data-testid="input-confirm-password"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">
                        Add extra security to your account with 2FA
                      </p>
                    </div>
                    <Switch data-testid="switch-2fa" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notification Preferences
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">System Updates & Maintenance</p>
                      <p className="text-xs text-muted-foreground">Important system notifications</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-system-updates" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Call Outcome Notifications</p>
                      <p className="text-xs text-muted-foreground">Email when calls are completed</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-call-outcomes" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Daily Activity Summaries</p>
                      <p className="text-xs text-muted-foreground">Daily email summary of activity</p>
                    </div>
                    <Switch data-testid="switch-daily-summaries" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Security & Login Alerts</p>
                      <p className="text-xs text-muted-foreground">Notifications about login attempts</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-security-alerts" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button data-testid="button-save-account-settings">
                  Save Account Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          if (section.id === "calls") {
            return (
              <TabsContent key="calls" value="calls" className="space-y-6">
          <Card data-testid="call-preferences-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Call Settings & Preferences
              </CardTitle>
              <CardDescription>
                Configure voice calling behavior, timing, and retry settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Call Timing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Default Call Timing</h3>
                <div className="space-y-2">
                  <Label htmlFor="default-call-timing">Default Hours Before Appointment</Label>
                  <Select defaultValue="24" data-testid="select-default-call-timing">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour before (Same-day reminders)</SelectItem>
                      <SelectItem value="2">2 hours before (Short-notice appointments)</SelectItem>
                      <SelectItem value="6">6 hours before (Professional services)</SelectItem>
                      <SelectItem value="24">24 hours before (Recommended)</SelectItem>
                      <SelectItem value="48">48 hours before (Important meetings)</SelectItem>
                      <SelectItem value="168">1 week before (Major procedures)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default timing for new contacts (can be customized per contact)
                  </p>
                </div>
              </div>

              <Separator />

              {/* Call Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Call Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="call-start-time">Call Start Time</Label>
                    <Input 
                      id="call-start-time"
                      type="time"
                      defaultValue="08:00"
                      data-testid="input-call-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="call-end-time">Call End Time</Label>
                    <Input 
                      id="call-end-time"
                      type="time"
                      defaultValue="20:00"
                      data-testid="input-call-end-time"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Allow Weekend Calling</p>
                      <p className="text-xs text-muted-foreground">Make calls on Saturday and Sunday</p>
                    </div>
                    <Switch data-testid="switch-weekend-calling" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Allow Holiday Calling</p>
                      <p className="text-xs text-muted-foreground">Make calls on bank holidays</p>
                    </div>
                    <Switch data-testid="switch-holiday-calling" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button data-testid="button-save-call-preferences">
                  Save Call Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          if (section.id === "integrations") {
            return (
              <TabsContent key="integrations" value="integrations" className="space-y-6">
          <Card data-testid="integration-settings-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Manage your calendar integrations and external service connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calendar Integrations */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendar Integrations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Cal.com</p>
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button variant="outline" data-testid="button-connect-calcom">
                      Connect
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Calendly</p>
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button variant="outline" data-testid="button-connect-calendly">
                      Connect
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Voice AI Integration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Voice AI Integration</h3>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Retell AI</p>
                      <p className="text-xs text-green-600">Connected</p>
                    </div>
                  </div>
                  <Button variant="outline" data-testid="button-configure-retell">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          if (section.id === "team") {
            return (
              <TabsContent key="team" value="team" className="space-y-6">
          <Card data-testid="team-management-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team & User Management
              </CardTitle>
              <CardDescription>
                Manage team members, roles, and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Team Members</h3>
                <Button data-testid="button-invite-team-member">
                  Invite Team Member
                </Button>
              </div>
              
              <div className="border rounded-lg">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="default">Admin</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          if (section.id === "privacy") {
            return (
              <TabsContent key="privacy" value="privacy" className="space-y-6">
          <Card data-testid="privacy-compliance-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Compliance
              </CardTitle>
              <CardDescription>
                Manage HIPAA settings, data retention, and privacy controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* HIPAA Compliance */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">HIPAA Compliance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">HIPAA Compliance Mode</p>
                      <p className="text-xs text-muted-foreground">Enable enhanced privacy controls for medical practices</p>
                    </div>
                    <Switch data-testid="switch-hipaa-compliance" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">PHI Data Encryption</p>
                      <p className="text-xs text-muted-foreground">Encrypt all protected health information</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-phi-encryption" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Retention */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Retention</h3>
                <div className="space-y-2">
                  <Label htmlFor="data-retention-period">Data Retention Period</Label>
                  <Select defaultValue="7" data-testid="select-data-retention">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 year</SelectItem>
                      <SelectItem value="3">3 years</SelectItem>
                      <SelectItem value="5">5 years</SelectItem>
                      <SelectItem value="7">7 years (Recommended)</SelectItem>
                      <SelectItem value="10">10 years</SelectItem>
                      <SelectItem value="forever">Retain indefinitely</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          if (section.id === "data") {
            return (
              <TabsContent key="data" value="data" className="space-y-6">
          <Card data-testid="data-management-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data & Export Controls
              </CardTitle>
              <CardDescription>
                Export your data, manage backups, and control data portability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Export */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Export</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" data-testid="button-export-contacts">
                    Export Contacts
                  </Button>
                  <Button variant="outline" data-testid="button-export-call-logs">
                    Export Call Logs
                  </Button>
                  <Button variant="outline" data-testid="button-export-appointments">
                    Export Appointments
                  </Button>
                  <Button variant="outline" data-testid="button-export-all-data">
                    Export All Data
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Backup Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Backup Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Automatic Backups</p>
                      <p className="text-xs text-muted-foreground">Automatically backup your data daily</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-auto-backup" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            );
          }

          return null;
        })}
      </Tabs>
    </div>
  );
}