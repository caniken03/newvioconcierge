import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building, 
  User, 
  Phone, 
  Settings, 
  Users, 
  Shield, 
  Database,
  Bell,
  Key,
  Globe,
  Mail,
  Smartphone,
  Clock,
  AlertCircle
} from "lucide-react";

// Call Settings Component
function CallSettingsContent() {
  const { toast } = useToast();
  const [selectedReminderHours, setSelectedReminderHours] = useState<number[]>([24, 1]);
  const [followUpRetryMinutes, setFollowUpRetryMinutes] = useState<number>(90);

  // Fetch current tenant configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/tenant/config'],
  });

  // Update local state when config is loaded
  useEffect(() => {
    if (config) {
      // Type assertion for tenant config with new timing fields
      const typedConfig = config as any;
      setSelectedReminderHours(typedConfig.reminderHoursBefore || [24, 1]);
      setFollowUpRetryMinutes(typedConfig.followUpRetryMinutes || 90);
    }
  }, [config]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: { reminderHoursBefore: number[]; followUpRetryMinutes: number }) => {
      const response = await apiRequest('POST', '/api/tenant/config', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/config'] });
      toast({
        title: "Settings saved",
        description: "Your call timing preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle reminder hour selection
  const toggleReminderHour = (hour: number) => {
    setSelectedReminderHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort((a, b) => b - a) // Sort descending
    );
  };

  const handleSave = () => {
    if (selectedReminderHours.length === 0) {
      toast({
        title: "Invalid selection",
        description: "Please select at least one reminder time.",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate({
      reminderHoursBefore: selectedReminderHours,
      followUpRetryMinutes,
    });
  };

  const reminderOptions = [
    { hours: 168, label: "1 week before", description: "Major procedures, surgeries" },
    { hours: 48, label: "2 days before", description: "Important meetings" },
    { hours: 24, label: "1 day before", description: "Standard appointments" },
    { hours: 12, label: "12 hours before", description: "Same-day confirmation" },
    { hours: 3, label: "3 hours before", description: "Last-minute reminders" },
    { hours: 2, label: "2 hours before", description: "Short-notice services" },
    { hours: 1, label: "1 hour before", description: "Final reminder call" },
  ];

  const followUpOptions = [
    { minutes: 60, label: "1 hour", description: "Quick follow-up for urgent appointments" },
    { minutes: 90, label: "1.5 hours", description: "Balanced timing (recommended)" },
    { minutes: 120, label: "2 hours", description: "Give clients more time to respond" },
  ];

  return (
    <TabsContent value="calls" className="space-y-6">
      <Card data-testid="call-preferences-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call Settings & Preferences
          </CardTitle>
          <CardDescription>
            Configure appointment reminder timing and missed call follow-up settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Reminder Hours Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <h3 className="text-lg font-medium">Appointment Reminder Times</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Select when to send appointment reminder calls. You can choose multiple times for comprehensive coverage.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reminderOptions.map((option) => (
                <div 
                  key={option.hours}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`reminder-${option.hours}`}
                    checked={selectedReminderHours.includes(option.hours)}
                    onCheckedChange={() => toggleReminderHour(option.hours)}
                    data-testid={`checkbox-reminder-${option.hours}h`}
                  />
                  <div className="grid gap-1 flex-1">
                    <Label 
                      htmlFor={`reminder-${option.hours}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selectedReminderHours.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Selected: {selectedReminderHours.sort((a, b) => b - a).map(h => 
                    `${h}h`
                  ).join(", ")} before appointment
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Follow-up Timing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              <h3 className="text-lg font-medium">Missed Call Follow-up</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              How long to wait before making a follow-up call if the initial appointment reminder goes unanswered.
            </p>
            
            <RadioGroup
              value={followUpRetryMinutes.toString()}
              onValueChange={(value) => setFollowUpRetryMinutes(parseInt(value))}
              data-testid="radio-group-followup-timing"
            >
              {followUpOptions.map((option) => (
                <div key={option.minutes} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem 
                    value={option.minutes.toString()} 
                    id={`followup-${option.minutes}`}
                    data-testid={`radio-followup-${option.minutes}min`}
                  />
                  <div className="grid gap-1 flex-1">
                    <Label 
                      htmlFor={`followup-${option.minutes}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              disabled={saveConfigMutation.isPending || isLoading}
              data-testid="button-save-call-preferences"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Call Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

// Business Hours Settings Component
function BusinessHoursContent() {
  const { toast } = useToast();
  
  // Fetch current business hours configuration
  const { data: businessHours, isLoading } = useQuery<any>({
    queryKey: ['/api/tenant/business-hours'],
  });

  const [config, setConfig] = useState({
    timezone: "Europe/London",
    mondayHours: { enabled: true, start: "09:00", end: "17:00" },
    tuesdayHours: { enabled: true, start: "09:00", end: "17:00" },
    wednesdayHours: { enabled: true, start: "09:00", end: "17:00" },
    thursdayHours: { enabled: true, start: "09:00", end: "17:00" },
    fridayHours: { enabled: true, start: "09:00", end: "17:00" },
    saturdayHours: { enabled: false, start: "09:00", end: "13:00" },
    sundayHours: { enabled: false, start: "10:00", end: "14:00" },
    respectBankHolidays: true,
    emergencyOverride: false,
  });

  // Update local state when config is loaded
  useEffect(() => {
    if (businessHours) {
      const parseHours = (hoursJson: string) => {
        try {
          return JSON.parse(hoursJson);
        } catch {
          return { enabled: false, start: "09:00", end: "17:00" };
        }
      };

      setConfig({
        timezone: businessHours.timezone || "Europe/London",
        mondayHours: parseHours(businessHours.mondayHours),
        tuesdayHours: parseHours(businessHours.tuesdayHours),
        wednesdayHours: parseHours(businessHours.wednesdayHours),
        thursdayHours: parseHours(businessHours.thursdayHours),
        fridayHours: parseHours(businessHours.fridayHours),
        saturdayHours: parseHours(businessHours.saturdayHours),
        sundayHours: parseHours(businessHours.sundayHours),
        respectBankHolidays: businessHours.respectBankHolidays ?? true,
        emergencyOverride: businessHours.emergencyOverride ?? false,
      });
    }
  }, [businessHours]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      const response = await apiRequest('PUT', '/api/tenant/business-hours', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/business-hours'] });
      toast({
        title: "Business hours saved",
        description: "Your operating hours have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save business hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const days = [
    { key: "mondayHours", label: "Monday" },
    { key: "tuesdayHours", label: "Tuesday" },
    { key: "wednesdayHours", label: "Wednesday" },
    { key: "thursdayHours", label: "Thursday" },
    { key: "fridayHours", label: "Friday" },
    { key: "saturdayHours", label: "Saturday" },
    { key: "sundayHours", label: "Sunday" },
  ];

  return (
    <TabsContent value="business-hours" className="space-y-6">
      <Card data-testid="business-hours-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Business Hours Configuration
          </CardTitle>
          <CardDescription>
            Set your operating hours to ensure calls are made during appropriate times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={config.timezone}
              onValueChange={(value) => setConfig(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger id="timezone" data-testid="select-timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Los Angeles (PST/PDT)</SelectItem>
                <SelectItem value="America/Chicago">Chicago (CST/CDT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEDT/AEST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Days of the Week */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Weekly Operating Hours</h3>
            {days.map(({ key, label }) => {
              const dayConfig = config[key as keyof typeof config] as { enabled: boolean; start: string; end: string };
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={dayConfig.enabled}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          [key]: { ...dayConfig, enabled: checked }
                        }))}
                        data-testid={`switch-${key}`}
                      />
                      <Label className={!dayConfig.enabled ? "text-muted-foreground" : ""}>
                        {label}
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayConfig.start}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        [key]: { ...dayConfig, start: e.target.value }
                      }))}
                      disabled={!dayConfig.enabled}
                      data-testid={`input-${key}-start`}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={dayConfig.end}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        [key]: { ...dayConfig, end: e.target.value }
                      }))}
                      disabled={!dayConfig.enabled}
                      data-testid={`input-${key}-end`}
                      className="w-32"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Additional Settings</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Respect Bank Holidays</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically skip calls on public holidays
                </p>
              </div>
              <Switch
                checked={config.respectBankHolidays}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, respectBankHolidays: checked }))}
                data-testid="switch-respect-bank-holidays"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saveConfigMutation.isPending || isLoading}
              data-testid="button-save-business-hours"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Business Hours"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
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
      id: "business-hours",
      title: "Business Hours",
      description: "Configure operating hours and timezone",
      icon: Clock,
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
      accessLevel: "super_admin_only"
    },
    {
      id: "team",
      title: "Team & User Management",
      description: "Manage staff access and permissions",
      icon: Users,
      accessLevel: "super_admin_only"
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

  const accessibleSections = profileSections.filter(section => {
    if (section.accessLevel === "all_users") return true;
    if (section.accessLevel === "client_admin_only") return user.role === "client_admin" || user.role === "super_admin";
    if (section.accessLevel === "super_admin_only") return user.role === "super_admin";
    return false;
  });

  // Set initial tab to first accessible section for the user's role
  const [activeTab, setActiveTab] = useState(accessibleSections[0]?.id || "account");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="space-y-6" data-testid="profile-page">
            {/* Page Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
                  <p className="text-muted-foreground">
                    Manage your account settings, business information, and system preferences
                  </p>
                </div>
              </div>
            </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-muted p-1 text-muted-foreground min-w-full lg:min-w-0 lg:w-auto">
            {accessibleSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2 min-w-fit flex-shrink-0"
                  data-testid={`tab-${section.id}`}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-xs lg:text-sm font-medium">{section.title}</span>
                  <span className="sm:hidden text-xs font-medium">{section.title.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

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

          if (section.id === "business-hours") {
            return <BusinessHoursContent key="business-hours" />;
          }

          if (section.id === "calls") {
            return <CallSettingsContent key="calls" />;
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
        </main>
      </div>
    </div>
  );
}