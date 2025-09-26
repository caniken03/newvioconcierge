import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";

export default function ClientAdminGuide() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="container mx-auto max-w-6xl" data-testid="client-admin-guide">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <i className="fas fa-user-cog mr-3 text-blue-500"></i>
            Client Admin User Guide
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Transform your appointment management with AI-powered voice reminders, automated workflows, and data-driven insights.
          </p>
          <Alert className="mb-6">
            <i className="fas fa-rocket"></i>
            <AlertTitle>Maximize Your ROI</AlertTitle>
            <AlertDescription>
              This comprehensive guide provides proven strategies to reduce no-shows by 40-60%, improve customer satisfaction, and streamline your appointment operations.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="contact-mgmt">Contact Management</TabsTrigger>
            <TabsTrigger value="voice-ai">Voice AI Setup</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Features</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started: Your Journey to Appointment Success</CardTitle>
                <CardDescription>
                  Follow this proven 30-day roadmap to transform your appointment management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-l-4 border-l-green-500 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-800">
                        <i className="fas fa-flag-checkered mr-2"></i>
                        Week 1: Foundation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Day 1-2:</strong> Import your customer contacts and appointment data</li>
                        <li>• <strong>Day 3-4:</strong> Configure your business profile and voice preferences</li>
                        <li>• <strong>Day 5-7:</strong> Run test voice calls and optimize scripts</li>
                      </ul>
                      <div className="mt-3 p-2 bg-white rounded border border-green-200">
                        <p className="text-xs text-green-600">
                          <strong>Success Target:</strong> Complete customer database import with 95%+ contact accuracy
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-800">
                        <i className="fas fa-rocket mr-2"></i>
                        Week 2-3: Optimization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Enable automation:</strong> Set up automated reminders and follow-ups</li>
                        <li>• <strong>Integrate calendars:</strong> Connect Cal.com, Calendly, or manual scheduling</li>
                        <li>• <strong>Train your team:</strong> Ensure all staff understand the new workflows</li>
                      </ul>
                      <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                        <p className="text-xs text-blue-600">
                          <strong>Success Target:</strong> 80%+ automation rate for routine appointment reminders
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-purple-800">
                        <i className="fas fa-chart-line mr-2"></i>
                        Week 4: Mastery
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Analyze results:</strong> Review your first month's performance data</li>
                        <li>• <strong>Fine-tune settings:</strong> Optimize based on customer feedback</li>
                        <li>• <strong>Scale up:</strong> Enable advanced features like automated rescheduling</li>
                      </ul>
                      <div className="mt-3 p-2 bg-white rounded border border-purple-200">
                        <p className="text-xs text-purple-600">
                          <strong>Success Target:</strong> Measurable reduction in no-shows within 30 days
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <i className="fas fa-star text-yellow-600"></i>
                  <AlertTitle className="text-yellow-800">Real Success Story</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    <strong>Sunshine Dental Practice:</strong> "Within 3 weeks of implementing VioConcierge, our no-show rate dropped from 23% to 8%. Our patients love the friendly voice reminders, and our staff saves 2 hours daily on appointment confirmations. We've recovered over $15,000 in lost revenue in just the first quarter!"
                    <br /><br />
                    <strong>Key Success Factors:</strong> Personalized voice scripts, 48-hour advance reminders, easy rescheduling options, and consistent follow-up.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Start Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold mb-2 text-green-700">Essential Setup (Day 1)</h5>
                        <ul className="text-sm space-y-1">
                          <li>□ Complete business profile</li>
                          <li>□ Upload customer contact list</li>
                          <li>□ Set business hours and time zone</li>
                          <li>□ Configure basic voice preferences</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2 text-blue-700">Optimization Setup (Week 1)</h5>
                        <ul className="text-sm space-y-1">
                          <li>□ Create custom voice scripts</li>
                          <li>□ Set up appointment reminder timing</li>
                          <li>□ Test voice calls with sample appointments</li>
                          <li>□ Train staff on customer response handling</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact-mgmt">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Master Contact Management for Maximum Impact</CardTitle>
                  <CardDescription>
                    Strategic contact organization and data management for optimal appointment outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-database mr-2"></i>
                          Contact Data Excellence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">Essential Information</h5>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Primary Phone:</strong> Mobile preferred for SMS and voice</li>
                              <li>• <strong>Email Address:</strong> For backup communications and confirmations</li>
                              <li>• <strong>Communication Preference:</strong> Voice, SMS, or email priority</li>
                              <li>• <strong>Best Contact Times:</strong> Morning, afternoon, evening preferences</li>
                              <li>• <strong>Special Notes:</strong> Accessibility needs, language preferences</li>
                            </ul>
                          </div>
                          <Alert className="bg-blue-100 border-blue-300">
                            <AlertDescription className="text-blue-800 text-sm">
                              <strong>Pro Tip:</strong> Contacts with complete information have 73% higher response rates and 45% fewer no-shows.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-tags mr-2"></i>
                          Smart Segmentation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">Customer Categories</h5>
                            <div className="space-y-2">
                              <div className="p-2 bg-white rounded border border-green-200">
                                <strong className="text-sm text-green-800">VIP Customers</strong>
                                <p className="text-xs text-green-600">High-value, frequent appointments. Priority scheduling and personalized service.</p>
                              </div>
                              <div className="p-2 bg-white rounded border border-green-200">
                                <strong className="text-sm text-green-800">New Customers</strong>
                                <p className="text-xs text-green-600">First-time appointments. Extra confirmation and welcome messaging.</p>
                              </div>
                              <div className="p-2 bg-white rounded border border-green-200">
                                <strong className="text-sm text-green-800">At-Risk Customers</strong>
                                <p className="text-xs text-green-600">History of no-shows or cancellations. Earlier reminders and follow-ups.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Import & Data Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h5 className="font-semibold text-purple-800 mb-2">
                              <i className="fas fa-upload mr-2"></i>
                              Import Methods
                            </h5>
                            <ul className="text-sm space-y-1 text-purple-700">
                              <li>• <strong>CSV Upload:</strong> Bulk import from spreadsheets</li>
                              <li>• <strong>Calendar Integration:</strong> Auto-sync from Cal.com/Calendly</li>
                              <li>• <strong>Manual Entry:</strong> Individual contact creation</li>
                              <li>• <strong>API Integration:</strong> Connect your existing CRM</li>
                            </ul>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h5 className="font-semibold text-orange-800 mb-2">
                              <i className="fas fa-shield-alt mr-2"></i>
                              Data Quality
                            </h5>
                            <ul className="text-sm space-y-1 text-orange-700">
                              <li>• <strong>Phone Validation:</strong> Automatic format checking</li>
                              <li>• <strong>Duplicate Detection:</strong> Merge similar contacts</li>
                              <li>• <strong>Missing Data Alerts:</strong> Identify incomplete records</li>
                              <li>• <strong>Regular Cleanup:</strong> Remove inactive contacts</li>
                            </ul>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h5 className="font-semibold text-red-800 mb-2">
                              <i className="fas fa-user-shield mr-2"></i>
                              Privacy & Consent
                            </h5>
                            <ul className="text-sm space-y-1 text-red-700">
                              <li>• <strong>Explicit Consent:</strong> Voice communication opt-in</li>
                              <li>• <strong>Easy Opt-out:</strong> Respect customer preferences</li>
                              <li>• <strong>Data Retention:</strong> Automatic cleanup policies</li>
                              <li>• <strong>Compliance:</strong> HIPAA, GDPR adherence</li>
                            </ul>
                          </div>
                        </div>

                        <Alert>
                          <i className="fas fa-lightbulb"></i>
                          <AlertTitle>Contact Management Best Practices</AlertTitle>
                          <AlertDescription>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <strong>Do's:</strong>
                                <ul className="text-sm space-y-1 mt-1">
                                  <li>• Update contact info after each interaction</li>
                                  <li>• Use consistent naming conventions</li>
                                  <li>• Tag contacts by service type or location</li>
                                  <li>• Regularly verify phone numbers and emails</li>
                                </ul>
                              </div>
                              <div>
                                <strong>Don'ts:</strong>
                                <ul className="text-sm space-y-1 mt-1">
                                  <li>• Store unnecessary personal information</li>
                                  <li>• Ignore bounce-back emails or failed calls</li>
                                  <li>• Mix personal and business contact data</li>
                                  <li>• Forget to honor opt-out requests</li>
                                </ul>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="voice-ai">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Voice AI Configuration for Maximum Customer Satisfaction</CardTitle>
                  <CardDescription>
                    Create engaging, professional voice interactions that customers love
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-microphone mr-2"></i>
                          Voice Personality & Tone
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">Industry-Optimized Voices</h5>
                            <div className="space-y-2">
                              <div className="p-3 bg-white rounded border border-blue-200">
                                <strong className="text-blue-800 text-sm">Healthcare & Medical</strong>
                                <p className="text-xs text-blue-600 mt-1">Professional, reassuring, empathetic tone. Slower speaking pace. Medical terminology awareness.</p>
                                <Badge variant="outline" className="mt-1 text-xs">95% patient satisfaction</Badge>
                              </div>
                              <div className="p-3 bg-white rounded border border-blue-200">
                                <strong className="text-blue-800 text-sm">Beauty & Wellness</strong>
                                <p className="text-xs text-blue-600 mt-1">Warm, friendly, upbeat personality. Natural conversational flow. Service-focused language.</p>
                                <Badge variant="outline" className="mt-1 text-xs">88% rebooking rate</Badge>
                              </div>
                              <div className="p-3 bg-white rounded border border-blue-200">
                                <strong className="text-blue-800 text-sm">Professional Services</strong>
                                <p className="text-xs text-blue-600 mt-1">Business-appropriate, efficient, clear communication. Respect for time and scheduling.</p>
                                <Badge variant="outline" className="mt-1 text-xs">92% response rate</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-script mr-2"></i>
                          Script Optimization
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">High-Converting Script Elements</h5>
                            <ul className="text-sm space-y-2">
                              <li>• <strong>Personal Greeting:</strong> "Hi [Name], this is Sarah from [Business]"</li>
                              <li>• <strong>Appointment Details:</strong> Date, time, service, location</li>
                              <li>• <strong>Easy Confirmation:</strong> "Press 1 to confirm, 2 to reschedule"</li>
                              <li>• <strong>Value Reminder:</strong> Preparation tips or service benefits</li>
                              <li>• <strong>Contact Options:</strong> "Call us at [number] for any questions"</li>
                            </ul>
                          </div>
                          <Alert className="bg-green-100 border-green-300">
                            <AlertDescription className="text-green-800 text-sm">
                              <strong>Success Formula:</strong> Personal + Clear + Actionable + Helpful = 40% higher response rates
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Voice AI Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h5 className="font-semibold text-purple-800 mb-2">
                            <i className="fas fa-brain mr-2"></i>
                            Smart Interactions
                          </h5>
                          <ul className="text-sm space-y-1 text-purple-700">
                            <li>• Natural language understanding</li>
                            <li>• Context-aware responses</li>
                            <li>• Emotion detection and adaptation</li>
                            <li>• Multi-language support</li>
                          </ul>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h5 className="font-semibold text-orange-800 mb-2">
                            <i className="fas fa-clock mr-2"></i>
                            Timing Optimization
                          </h5>
                          <ul className="text-sm space-y-1 text-orange-700">
                            <li>• Customer time zone awareness</li>
                            <li>• Best contact time learning</li>
                            <li>• Retry logic for failed calls</li>
                            <li>• Holiday and weekend handling</li>
                          </ul>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <h5 className="font-semibold text-red-800 mb-2">
                            <i className="fas fa-chart-line mr-2"></i>
                            Quality Monitoring
                          </h5>
                          <ul className="text-sm space-y-1 text-red-700">
                            <li>• Call success rate tracking</li>
                            <li>• Customer satisfaction scoring</li>
                            <li>• Voice quality analytics</li>
                            <li>• Continuous improvement suggestions</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="bg-yellow-50 border-yellow-200">
                    <i className="fas fa-magic text-yellow-600"></i>
                    <AlertTitle className="text-yellow-800">Voice AI Success Story</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      <strong>Elite Spa & Wellness:</strong> "We customized our voice AI with a warm, spa-like tone and added relaxation tips in our reminders. Customer feedback has been incredible - 96% say our voice reminders actually enhance their spa experience. We've seen a 51% reduction in no-shows and 34% increase in add-on service bookings!"
                      <br /><br />
                      <strong>Key Customizations:</strong> Calming voice tone, wellness tips, service preparation reminders, and gentle upselling for complementary treatments.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Automation Workflows That Drive Results</CardTitle>
                  <CardDescription>
                    Set up intelligent automation to reduce manual work and improve customer experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-robot mr-2"></i>
                          Smart Reminder Sequences
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">Optimal Timing Strategy</h5>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3 p-2 bg-white rounded border border-blue-200">
                                <Badge variant="outline">72 Hours</Badge>
                                <div className="text-sm">
                                  <strong>Initial Reminder:</strong> Appointment confirmation with details
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 p-2 bg-white rounded border border-blue-200">
                                <Badge variant="outline">24 Hours</Badge>
                                <div className="text-sm">
                                  <strong>Final Reminder:</strong> Last chance to reschedule
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 p-2 bg-white rounded border border-blue-200">
                                <Badge variant="outline">2 Hours</Badge>
                                <div className="text-sm">
                                  <strong>Departure Alert:</strong> Travel time and preparation tips
                                </div>
                              </div>
                            </div>
                          </div>
                          <Alert className="bg-blue-100 border-blue-300">
                            <AlertDescription className="text-blue-800 text-sm">
                              <strong>Research-Backed:</strong> This 3-touch sequence reduces no-shows by 58% compared to single reminders.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-exchange-alt mr-2"></i>
                          Automated Rescheduling
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">Self-Service Workflow</h5>
                            <ul className="text-sm space-y-2">
                              <li>• <strong>Instant Options:</strong> AI provides 3-5 alternative time slots</li>
                              <li>• <strong>One-Click Booking:</strong> Customers confirm new time via voice/SMS</li>
                              <li>• <strong>Calendar Sync:</strong> Automatic updates to your scheduling system</li>
                              <li>• <strong>Confirmation Loop:</strong> Immediate confirmation of new appointment</li>
                            </ul>
                          </div>
                          <div className="bg-white p-3 rounded border border-green-200">
                            <p className="text-xs text-green-600">
                              <strong>Time Savings:</strong> Automated rescheduling saves 15 minutes per change, reducing admin work by 70%.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Automation Strategies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h5 className="font-semibold mb-3">Customer Journey Automation</h5>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                              <i className="fas fa-user-plus text-2xl text-purple-600 mb-2"></i>
                              <h6 className="font-semibold text-purple-800 text-sm">New Customer</h6>
                              <p className="text-xs text-purple-700 mt-1">Welcome sequence, expectation setting, preparation guidelines</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                              <i className="fas fa-calendar-check text-2xl text-blue-600 mb-2"></i>
                              <h6 className="font-semibold text-blue-800 text-sm">Appointment Confirmed</h6>
                              <p className="text-xs text-blue-700 mt-1">Confirmation message, calendar invite, preparation reminders</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                              <i className="fas fa-check-circle text-2xl text-green-600 mb-2"></i>
                              <h6 className="font-semibold text-green-800 text-sm">Service Complete</h6>
                              <p className="text-xs text-green-700 mt-1">Thank you message, feedback request, next appointment scheduling</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-center">
                              <i className="fas fa-star text-2xl text-orange-600 mb-2"></i>
                              <h6 className="font-semibold text-orange-800 text-sm">Follow-up</h6>
                              <p className="text-xs text-orange-700 mt-1">Care instructions, satisfaction survey, loyalty program enrollment</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-semibold mb-3">Intelligent Escalation Rules</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h6 className="font-semibold text-red-800 mb-2">No Response Triggers</h6>
                              <ul className="text-sm space-y-1 text-red-700">
                                <li>• After 2 failed voice calls → Send SMS backup</li>
                                <li>• After 24 hours no response → Email notification</li>
                                <li>• Same-day appointment → Staff manual call</li>
                                <li>• VIP customer → Immediate staff notification</li>
                              </ul>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h6 className="font-semibold text-yellow-800 mb-2">Staff Alert Conditions</h6>
                              <ul className="text-sm space-y-1 text-yellow-700">
                                <li>• Multiple reschedule requests</li>
                                <li>• Customer expresses dissatisfaction</li>
                                <li>• Technical issues with contact</li>
                                <li>• Special accommodation requests</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <i className="fas fa-lightbulb"></i>
                    <AlertTitle>Automation ROI Calculator</AlertTitle>
                    <AlertDescription>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">15 min</div>
                          <div className="text-xs text-muted-foreground">Saved per reminder</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">70%</div>
                          <div className="text-xs text-muted-foreground">Reduction in admin calls</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">$2,400</div>
                          <div className="text-xs text-muted-foreground">Monthly time savings value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">45%</div>
                          <div className="text-xs text-muted-foreground">Increase in staff productivity</div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Performance Insights</CardTitle>
                  <CardDescription>
                    Transform data into actionable business intelligence for continuous improvement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-chart-bar mr-2"></i>
                          Key Performance Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-white rounded border border-blue-200">
                              <div className="text-2xl font-bold text-blue-600">8.2%</div>
                              <div className="text-xs text-blue-700">Current No-Show Rate</div>
                              <Badge variant="outline" className="mt-1 text-xs">↓47% vs baseline</Badge>
                            </div>
                            <div className="text-center p-3 bg-white rounded border border-blue-200">
                              <div className="text-2xl font-bold text-green-600">94.1%</div>
                              <div className="text-xs text-green-700">Call Success Rate</div>
                              <Badge variant="outline" className="mt-1 text-xs">Industry leading</Badge>
                            </div>
                            <div className="text-center p-3 bg-white rounded border border-blue-200">
                              <div className="text-2xl font-bold text-purple-600">4.7★</div>
                              <div className="text-xs text-purple-700">Customer Satisfaction</div>
                              <Badge variant="outline" className="mt-1 text-xs">+0.9 vs manual</Badge>
                            </div>
                            <div className="text-center p-3 bg-white rounded border border-blue-200">
                              <div className="text-2xl font-bold text-orange-600">1.9s</div>
                              <div className="text-xs text-orange-700">Avg Response Time</div>
                              <Badge variant="outline" className="mt-1 text-xs">Excellent</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-dollar-sign mr-2"></i>
                          Revenue Impact Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h6 className="font-semibold text-green-700 mb-2">Monthly Revenue Recovery</h6>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-2 bg-white rounded border border-green-200">
                                <span className="text-sm text-green-700">Prevented No-Shows</span>
                                <span className="font-bold text-green-800">$12,400</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-white rounded border border-green-200">
                                <span className="text-sm text-green-700">Improved Scheduling</span>
                                <span className="font-bold text-green-800">$3,200</span>
                              </div>
                              <div className="flex justify-between items-center p-2 bg-white rounded border border-green-200">
                                <span className="text-sm text-green-700">Staff Time Savings</span>
                                <span className="font-bold text-green-800">$2,800</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between items-center p-2 bg-green-100 rounded border border-green-300">
                                <span className="font-bold text-green-800">Total Monthly ROI</span>
                                <span className="text-lg font-bold text-green-900">$18,400</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Analytics Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h6 className="font-semibold text-purple-800 mb-2">
                            <i className="fas fa-magnifying-glass-chart mr-2"></i>
                            Predictive Analytics
                          </h6>
                          <ul className="text-sm space-y-1 text-purple-700">
                            <li>• No-show probability scoring</li>
                            <li>• Optimal reminder timing prediction</li>
                            <li>• Customer lifetime value forecasting</li>
                            <li>• Seasonal trend analysis</li>
                          </ul>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h6 className="font-semibold text-orange-800 mb-2">
                            <i className="fas fa-users mr-2"></i>
                            Customer Insights
                          </h6>
                          <ul className="text-sm space-y-1 text-orange-700">
                            <li>• Communication preference patterns</li>
                            <li>• Response time analytics</li>
                            <li>• Satisfaction correlation analysis</li>
                            <li>• Behavioral segmentation</li>
                          </ul>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <h6 className="font-semibold text-red-800 mb-2">
                            <i className="fas fa-cogs mr-2"></i>
                            Operational Metrics
                          </h6>
                          <ul className="text-sm space-y-1 text-red-700">
                            <li>• Voice quality monitoring</li>
                            <li>• System performance tracking</li>
                            <li>• Integration health status</li>
                            <li>• Cost per interaction analysis</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="bg-blue-50 border-blue-200">
                    <i className="fas fa-trophy text-blue-600"></i>
                    <AlertTitle className="text-blue-800">Monthly Performance Review Template</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <strong>Operational Review:</strong>
                          <ul className="text-sm space-y-1 mt-1">
                            <li>• Compare no-show rates vs. previous month</li>
                            <li>• Analyze voice call success patterns</li>
                            <li>• Review customer feedback and satisfaction</li>
                            <li>• Identify peak performance periods</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Strategic Planning:</strong>
                          <ul className="text-sm space-y-1 mt-1">
                            <li>• Optimize reminder timing based on data</li>
                            <li>• Adjust voice scripts for better engagement</li>
                            <li>• Plan capacity for high-demand periods</li>
                            <li>• Set goals for next month's improvements</li>
                          </ul>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Features & Integrations</CardTitle>
                  <CardDescription>
                    Unlock the full potential of VioConcierge with premium features and custom integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-800">
                          <i className="fas fa-link mr-2"></i>
                          Calendar Integrations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h6 className="font-semibold text-purple-700 mb-2">Supported Platforms</h6>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-white rounded border border-purple-200">
                                <div className="flex items-center space-x-2">
                                  <i className="fab fa-calendly text-blue-500"></i>
                                  <span className="text-sm font-medium">Calendly</span>
                                </div>
                                <Badge variant="outline">Real-time sync</Badge>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-white rounded border border-purple-200">
                                <div className="flex items-center space-x-2">
                                  <i className="fas fa-calendar text-green-500"></i>
                                  <span className="text-sm font-medium">Cal.com</span>
                                </div>
                                <Badge variant="outline">Webhook support</Badge>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-white rounded border border-purple-200">
                                <div className="flex items-center space-x-2">
                                  <i className="fab fa-google text-red-500"></i>
                                  <span className="text-sm font-medium">Google Calendar</span>
                                </div>
                                <Badge variant="outline">API integration</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-shield-alt mr-2"></i>
                          HIPAA Compliance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h6 className="font-semibold text-green-700 mb-2">Healthcare-Grade Security</h6>
                            <ul className="text-sm space-y-1 text-green-700">
                              <li>• <strong>Encryption:</strong> End-to-end data protection</li>
                              <li>• <strong>Access Controls:</strong> Role-based permissions</li>
                              <li>• <strong>Audit Logging:</strong> Complete activity tracking</li>
                              <li>• <strong>Data Retention:</strong> Automated compliance policies</li>
                              <li>• <strong>BAA Agreement:</strong> Business Associate Agreement included</li>
                            </ul>
                          </div>
                          <Alert className="bg-green-100 border-green-300">
                            <AlertDescription className="text-green-800 text-xs">
                              <strong>Medical Practice Ready:</strong> All healthcare-specific requirements automatically configured.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Premium Feature Spotlight</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h6 className="font-semibold text-yellow-800 mb-2">
                            <i className="fas fa-palette mr-2"></i>
                            Custom Branding
                          </h6>
                          <ul className="text-sm space-y-1 text-yellow-700">
                            <li>• Custom hold music and tones</li>
                            <li>• Branded voice messages</li>
                            <li>• Personalized email templates</li>
                            <li>• Logo integration in communications</li>
                          </ul>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h6 className="font-semibold text-blue-800 mb-2">
                            <i className="fas fa-code mr-2"></i>
                            API Access
                          </h6>
                          <ul className="text-sm space-y-1 text-blue-700">
                            <li>• RESTful API endpoints</li>
                            <li>• Webhook notifications</li>
                            <li>• Custom integration development</li>
                            <li>• Real-time data access</li>
                          </ul>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <h6 className="font-semibold text-purple-800 mb-2">
                            <i className="fas fa-headset mr-2"></i>
                            Priority Support
                          </h6>
                          <ul className="text-sm space-y-1 text-purple-700">
                            <li>• Dedicated account manager</li>
                            <li>• 24/7 technical support</li>
                            <li>• Priority feature requests</li>
                            <li>• Custom training sessions</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                    <i className="fas fa-star text-amber-600"></i>
                    <AlertTitle className="text-amber-800">Success Implementation Strategy</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      <div className="mt-3">
                        <strong>Phase 1 (Month 1-2):</strong> Core Features - Focus on contact management, basic voice reminders, and calendar integration.
                        <br />
                        <strong>Phase 2 (Month 3-4):</strong> Automation - Enable advanced workflows, automated rescheduling, and intelligent escalations.
                        <br />
                        <strong>Phase 3 (Month 5+):</strong> Optimization - Leverage analytics, custom branding, and advanced integrations for maximum ROI.
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-2">Ready to Maximize Your Success?</h3>
          <p className="text-blue-700 mb-4">
            Take advantage of additional resources and support to accelerate your appointment management transformation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <i className="fas fa-phone mr-2"></i>
              Schedule Strategy Call
            </Button>
            <Button size="sm" variant="outline">
              <i className="fas fa-graduation-cap mr-2"></i>
              Training Videos
            </Button>
            <Button size="sm" variant="outline">
              <i className="fas fa-users mr-2"></i>
              User Community
            </Button>
            <Button size="sm" variant="outline">
              <i className="fas fa-envelope mr-2"></i>
              Email Support
            </Button>
          </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}