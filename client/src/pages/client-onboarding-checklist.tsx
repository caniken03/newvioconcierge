import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { Printer, Download, CheckSquare } from "lucide-react";

export default function ClientOnboardingChecklist() {
  const { user } = useAuth();

  if (!user) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="container mx-auto max-w-6xl print:max-w-none" data-testid="client-onboarding-checklist">
            <div className="mb-6 flex items-center justify-between print:hidden">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  <CheckSquare className="inline-block mr-3 h-8 w-8 text-blue-500" />
                  Client Onboarding Checklist
                </h1>
                <p className="text-xl text-muted-foreground">
                  Complete guide for setting up new clients on VioConcierge
                </p>
              </div>
              <Button onClick={handlePrint} variant="outline" data-testid="button-print-checklist">
                <Printer className="mr-2 h-4 w-4" />
                Print Checklist
              </Button>
            </div>

            <Alert className="mb-6 print:hidden">
              <i className="fas fa-lightbulb"></i>
              <AlertTitle>Pro Tip</AlertTitle>
              <AlertDescription>
                Use this checklist for every new client to ensure consistent, thorough onboarding. Print it out or keep it handy during setup calls.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <Card>
                <CardHeader className="bg-blue-50 dark:bg-blue-950">
                  <CardTitle className="text-2xl">📋 Platform API Keys & Services</CardTitle>
                  <CardDescription>One-time setup per platform (if not already configured)</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Required Services</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">
                            <strong>Retell AI API Key</strong> - For voice AI calls (RETELL_API_KEY)
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">
                            <strong>Resend API Key</strong> - For email notifications and daily summaries
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">
                            <strong>Database</strong> - PostgreSQL connection (automatically provided by Replit)
                          </label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Optional Integrations (if client needs them)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">
                            <strong>Calendly API Key</strong> - If client uses Calendly for scheduling
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">
                            <strong>Calendly Webhook Secret</strong> - For automatic appointment sync
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">
                            <strong>Cal.com Webhook Setup</strong> - If client uses Cal.com for scheduling
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-green-50 dark:bg-green-950">
                  <CardTitle className="text-2xl">👤 Client Information</CardTitle>
                  <CardDescription>Collect from client before setup</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Business Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Company/Business Name</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Primary Contact Person (Name, Email, Phone)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Business Type/Industry (Healthcare, Wellness, Professional Services, etc.)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Business Address</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Time Zone</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Business Hours (Days & Hours of operation)</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Contact Data</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Customer/Contact List (CSV or from calendar integration)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Appointment Schedule/History (if available)</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Branding & Voice</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Preferred Voice Tone (Professional, Friendly, Warm)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Travel/Parking Directions (for voice AI to communicate)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Special Instructions or Notes</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-purple-50 dark:bg-purple-950">
                  <CardTitle className="text-2xl">⚙️ System Configuration</CardTitle>
                  <CardDescription>Set up in platform</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Tenant Creation (Super Admin)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Create new tenant in 7-step wizard</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set tenant name and basic info</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Configure industry template (Healthcare, Wellness, or Professional)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set default business hours</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Enable required features</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Voice AI Configuration</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Configure Retell AI agent for tenant</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set voice personality/tone</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Add business-specific context (name, services, etc.)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Configure travel/parking directions</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Test voice quality with sample calls</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Call Settings</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set initial reminder timing (24h, 48h, 72h before appointment)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Configure missed call follow-up timing (e.g., 90 minutes after)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set call window/business hours</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Configure voicemail behavior</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Email Notifications</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set up daily summary email schedule</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Configure email delivery time (in client's timezone)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set which notifications to include</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Add recipient email addresses</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-orange-50 dark:bg-orange-950">
                  <CardTitle className="text-2xl">📊 Data Setup</CardTitle>
                  <CardDescription>Import client data</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Contact Import</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Prepare contact CSV (Name, Phone, Email)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Validate phone numbers (E.164 format)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Remove duplicates</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Import contacts to system</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Verify import success</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Appointment Setup</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Import existing appointments OR Connect calendar integration</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Test calendar sync</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Verify appointment data accuracy</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-cyan-50 dark:bg-cyan-950">
                  <CardTitle className="text-2xl">👥 User Access Setup</CardTitle>
                  <CardDescription>Create accounts</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Admin Account</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Create Client Admin user account</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Send invitation email</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Verify account activation</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Walk through initial login</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Team Members (if applicable)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Identify additional users needed</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set roles (Client Admin vs Client User)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Send team invitations</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Verify all access</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-yellow-50 dark:bg-yellow-950">
                  <CardTitle className="text-2xl">🧪 Testing & Validation</CardTitle>
                  <CardDescription>Before go-live</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Test Workflow</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Create 5-10 test appointments</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Trigger test reminder calls</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Verify call outcomes (confirmed, no-answer, voicemail, etc.)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Check email notifications</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Review daily summary email</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Test calendar sync (if integrated)</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Feature Verification</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Call Now function works</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Cancel Call function works</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Rescheduling detected properly</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Analytics showing correct data</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Dashboard displaying metrics</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-pink-50 dark:bg-pink-950">
                  <CardTitle className="text-2xl">📚 Training & Handoff</CardTitle>
                  <CardDescription>Client education</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Documentation</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Share Client Admin User Guide link</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Walk through key features</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Explain dashboard metrics</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Show how to add/import contacts</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Demonstrate voice AI configuration</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Support Setup</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Provide support contact info</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Set up regular check-in schedule (Week 1, 2, 4)</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Document any custom configurations</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Create escalation process</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-teal-50 dark:bg-teal-950">
                  <CardTitle className="text-2xl">📈 Post-Launch Monitoring</CardTitle>
                  <CardDescription>First 30 days</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Week 1</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Daily check-in on call success rate</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Monitor for any failed calls</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Address technical issues immediately</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Collect initial feedback</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Week 2-3</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Review analytics and performance</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Optimize call timing if needed</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Adjust voice scripts based on feedback</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Check no-show reduction metrics</label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 text-lg">Week 4</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Full performance review</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Calculate ROI achieved</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Enable advanced features if ready</label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4" />
                          <label className="text-sm">Plan ongoing optimization</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-500">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                  <CardTitle className="text-2xl">🔑 Quick Reference: Environment Variables</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-lg text-green-700">✅ Required (Platform-wide)</h4>
                      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg font-mono text-sm space-y-1">
                        <div>DATABASE_URL <span className="text-muted-foreground">(auto-provided by Replit)</span></div>
                        <div>RETELL_API_KEY</div>
                        <div>RESEND_API_KEY</div>
                        <div>AUDIT_HMAC_SECRET</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-lg text-blue-700">✅ Optional (Per Client)</h4>
                      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg font-mono text-sm space-y-1">
                        <div>CALENDLY_API_KEY <span className="text-muted-foreground">(if client uses Calendly)</span></div>
                        <div>CALENDLY_WEBHOOK_SECRET</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="print:hidden">
                <i className="fas fa-star"></i>
                <AlertTitle>Pro Tips for Success</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• <strong>Start Small:</strong> Test with 1 client thoroughly before scaling</li>
                    <li>• <strong>Document Everything:</strong> Keep notes on each client's custom setup</li>
                    <li>• <strong>Set Expectations:</strong> Inform clients about 30-day optimization period</li>
                    <li>• <strong>Monitor Closely:</strong> First week is critical for catching issues</li>
                    <li>• <strong>Iterate Quickly:</strong> Use client feedback to refine the process</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
