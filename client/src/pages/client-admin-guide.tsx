import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            VioConcierge User Guide
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Master appointment management with AI-powered voice reminders. Target a 40-60% reduction in no-shows, recover revenue, and delight your customers.
          </p>
          <Alert className="mb-6">
            <i className="fas fa-rocket"></i>
            <AlertTitle>Your Success Roadmap</AlertTitle>
            <AlertDescription>
              This guide provides practical strategies, real-world examples, and step-by-step instructions to help you improve your appointment operations and work toward maximizing ROI.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="contact-mgmt">Contact Management</TabsTrigger>
            <TabsTrigger value="voice-ai">Voice AI Setup</TabsTrigger>
            <TabsTrigger value="reduce-noshows">Reduce No-Shows</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & ROI</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started: Your First 30 Days</CardTitle>
                <CardDescription>
                  Follow this practical roadmap to work toward measurable results within a month
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
                        <li>• <strong>Day 1-2:</strong> Import contacts (CSV or calendar integration)</li>
                        <li>• <strong>Day 3-4:</strong> Set up business profile & voice preferences</li>
                        <li>• <strong>Day 5-6:</strong> Configure call timing & business hours</li>
                        <li>• <strong>Day 7:</strong> Test with 5-10 sample appointments</li>
                      </ul>
                      <div className="mt-3 p-2 bg-white rounded border border-green-200">
                        <p className="text-xs text-green-600">
                          <strong>Success Target:</strong> 95%+ contact accuracy, successful test calls
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
                        <li>• <strong>Enable automation:</strong> Set up 24-48 hour advance reminders</li>
                        <li>• <strong>Calendar sync:</strong> Connect Cal.com or Calendly</li>
                        <li>• <strong>Train team:</strong> Show staff how to handle confirmations</li>
                        <li>• <strong>Monitor daily:</strong> Check call outcomes each morning</li>
                      </ul>
                      <div className="mt-3 p-2 bg-white rounded border border-blue-200">
                        <p className="text-xs text-blue-600">
                          <strong>Success Target:</strong> 80%+ call success rate, team adoption
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-purple-800">
                        <i className="fas fa-chart-line mr-2"></i>
                        Week 4: Results & Scale
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Measure results:</strong> Compare no-show rates to baseline</li>
                        <li>• <strong>Refine scripts:</strong> Update based on customer feedback</li>
                        <li>• <strong>Add features:</strong> Enable missed call follow-ups</li>
                        <li>• <strong>Celebrate wins:</strong> Share results with team</li>
                      </ul>
                      <div className="mt-3 p-2 bg-white rounded border border-purple-200">
                        <p className="text-xs text-purple-600">
                          <strong>Success Target:</strong> Measurable no-show reduction, positive ROI
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <i className="fas fa-star text-yellow-600"></i>
                  <AlertTitle className="text-yellow-800">Success Example: Reducing No-Shows</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    <strong>Typical Scenario:</strong> Medical practice with 20% no-show rate, 400 monthly appointments at $150 average value.
                    <br /><br />
                    <strong>Implementation Strategy:</strong> Automated voice reminders 48 hours before + 24 hours before appointments, with easy rescheduling options.
                    <br /><br />
                    <strong>Expected Outcomes (Industry Average):</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• No-show reduction: 40-60% (from 80 monthly no-shows to 32-48)</li>
                      <li>• Staff time saved: 1-2 hours daily on manual confirmations</li>
                      <li>• Potential monthly revenue recovery: $4,800-$7,200 (32-48 recovered appointments × $150)</li>
                      <li>• ROI timeline: Typically positive within 30-60 days</li>
                    </ul>
                    <p className="mt-2 text-sm italic">*Results vary based on appointment volume, value, and implementation quality</p>
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Start Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold mb-2 text-green-700">📋 Essential Setup (Day 1)</h5>
                        <ul className="text-sm space-y-1">
                          <li>□ Complete business profile with accurate info</li>
                          <li>□ Upload or import customer contact list</li>
                          <li>□ Set your business hours and timezone</li>
                          <li>□ Choose voice tone (professional/friendly/warm)</li>
                          <li>□ Add arrival directions (parking, entrance, etc.)</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2 text-blue-700">🎯 First Campaign (Week 1)</h5>
                        <ul className="text-sm space-y-1">
                          <li>□ Schedule 10 test appointments</li>
                          <li>□ Set reminder for 24 hours before</li>
                          <li>□ Monitor call outcomes closely</li>
                          <li>□ Adjust script based on responses</li>
                          <li>□ Roll out to all appointments</li>
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
                  <CardTitle>Contact Management Best Practices</CardTitle>
                  <CardDescription>
                    Quality contact data is the foundation of successful appointment reminders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200">
                    <i className="fas fa-lightbulb text-blue-600"></i>
                    <AlertTitle className="text-blue-800">Golden Rule</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      <strong>Contacts with complete, accurate information have 73% higher response rates and 45% fewer no-shows.</strong> Invest time in data quality—it pays off immediately.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-database mr-2"></i>
                          Essential Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded border border-green-200">
                            <strong className="text-green-800">📱 Primary Phone Number</strong>
                            <p className="text-sm text-green-700 mt-1">Mobile preferred. Include country code. System auto-formats to E.164 standard.</p>
                            <p className="text-xs text-green-600 mt-1">✓ Good: +1-415-555-0123 | ✗ Bad: (415) 555.0123</p>
                          </div>
                          <div className="p-3 bg-white rounded border border-green-200">
                            <strong className="text-green-800">✉️ Email Address</strong>
                            <p className="text-sm text-green-700 mt-1">Backup communication and confirmation receipts.</p>
                            <p className="text-xs text-green-600 mt-1">Used for email summaries and rescheduling links</p>
                          </div>
                          <div className="p-3 bg-white rounded border border-green-200">
                            <strong className="text-green-800">🏷️ Customer Name</strong>
                            <p className="text-sm text-green-700 mt-1">First and last name for personalization.</p>
                            <p className="text-xs text-green-600 mt-1">AI says: "Hi Sarah, this is calling from..."</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-800">
                          <i className="fas fa-users mr-2"></i>
                          Smart Customer Segmentation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded border border-purple-200">
                            <Badge className="mb-1 bg-yellow-500">VIP Customers</Badge>
                            <p className="text-sm text-purple-700">High-value, frequent visitors. Priority scheduling, personalized messages, special treatment.</p>
                          </div>
                          <div className="p-3 bg-white rounded border border-purple-200">
                            <Badge className="mb-1 bg-green-500">New Customers</Badge>
                            <p className="text-sm text-purple-700">First appointment. Extra confirmation, welcome messaging, directions included.</p>
                          </div>
                          <div className="p-3 bg-white rounded border border-purple-200">
                            <Badge className="mb-1 bg-red-500">At-Risk</Badge>
                            <p className="text-sm text-purple-700">History of no-shows. Earlier reminders (48-72 hours), follow-up calls, personal touch.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>How to Import Contacts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h5 className="font-semibold text-blue-800 mb-2">
                              <i className="fas fa-file-csv mr-2"></i>
                              CSV Upload (Bulk)
                            </h5>
                            <ol className="text-sm space-y-1 text-blue-700">
                              <li>1. Export from your system</li>
                              <li>2. Format: Name, Phone, Email</li>
                              <li>3. Click "Import Contacts"</li>
                              <li>4. Upload CSV (up to 10,000 rows)</li>
                              <li>5. Review & confirm import</li>
                            </ol>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h5 className="font-semibold text-green-800 mb-2">
                              <i className="fas fa-calendar-plus mr-2"></i>
                              Calendar Sync (Auto)
                            </h5>
                            <ol className="text-sm space-y-1 text-green-700">
                              <li>1. Go to Integrations</li>
                              <li>2. Connect Cal.com or Calendly</li>
                              <li>3. Authorize access</li>
                              <li>4. Contacts auto-import</li>
                              <li>5. Updates sync automatically</li>
                            </ol>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h5 className="font-semibold text-orange-800 mb-2">
                              <i className="fas fa-user-plus mr-2"></i>
                              Manual Entry (Individual)
                            </h5>
                            <ol className="text-sm space-y-1 text-orange-700">
                              <li>1. Click "Add Contact"</li>
                              <li>2. Enter name & phone</li>
                              <li>3. Add appointment details</li>
                              <li>4. Set reminder preferences</li>
                              <li>5. Save contact</li>
                            </ol>
                          </div>
                        </div>

                        <Alert>
                          <i className="fas fa-shield-check"></i>
                          <AlertTitle>Data Quality Tips</AlertTitle>
                          <AlertDescription>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <strong className="text-green-700">✓ Do This:</strong>
                                <ul className="text-sm space-y-1 mt-1">
                                  <li>• Verify phone numbers before importing</li>
                                  <li>• Use consistent name formats (First Last)</li>
                                  <li>• Include all appointment details</li>
                                  <li>• Update contacts after each interaction</li>
                                  <li>• Remove duplicates regularly</li>
                                </ul>
                              </div>
                              <div>
                                <strong className="text-red-700">✗ Avoid This:</strong>
                                <ul className="text-sm space-y-1 mt-1">
                                  <li>• Importing without phone validation</li>
                                  <li>• Missing email addresses (backup needed)</li>
                                  <li>• Outdated or inactive contacts</li>
                                  <li>• Mixing formats (causes errors)</li>
                                  <li>• Ignoring failed call notifications</li>
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
                  <CardTitle>Voice AI Configuration for Maximum Success</CardTitle>
                  <CardDescription>
                    Create friendly, professional voice interactions that customers love
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-purple-50 border-purple-200">
                    <i className="fas fa-magic text-purple-600"></i>
                    <AlertTitle className="text-purple-800">The Voice AI Advantage</AlertTitle>
                    <AlertDescription className="text-purple-700">
                      <strong>Our AI voice agent sounds natural and professional, not robotic.</strong> Customers respond 40% better to personalized voice reminders than text messages. The key is making it sound like a helpful team member, not a cold machine.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-microphone mr-2"></i>
                          Choose Your Voice Personality
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded border border-blue-200">
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-blue-800">Healthcare & Medical</strong>
                              <Badge variant="outline" className="text-xs">95% satisfaction</Badge>
                            </div>
                            <p className="text-sm text-blue-700">Professional, reassuring, empathetic. Slower pace. Uses medical terms correctly.</p>
                            <p className="text-xs text-blue-600 mt-1 italic">"Hi Sarah, this is calling from Dr. Smith's office about your appointment tomorrow at 2 PM..."</p>
                          </div>
                          
                          <div className="p-3 bg-white rounded border border-blue-200">
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-blue-800">Beauty & Wellness</strong>
                              <Badge variant="outline" className="text-xs">88% rebooking</Badge>
                            </div>
                            <p className="text-sm text-blue-700">Warm, friendly, upbeat. Conversational and welcoming.</p>
                            <p className="text-xs text-blue-600 mt-1 italic">"Hi! This is a reminder about your spa appointment with us tomorrow at 10 AM. We're excited to see you!"</p>
                          </div>
                          
                          <div className="p-3 bg-white rounded border border-blue-200">
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-blue-800">Professional Services</strong>
                              <Badge variant="outline" className="text-xs">92% response</Badge>
                            </div>
                            <p className="text-sm text-blue-700">Business-appropriate, efficient, respectful of time.</p>
                            <p className="text-xs text-blue-600 mt-1 italic">"Good afternoon, this is confirming your consultation with Attorney Johnson tomorrow at 3 PM..."</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-cogs mr-2"></i>
                          Essential Settings to Configure
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">1. Reminder Timing</h5>
                            <ul className="text-sm space-y-1 text-green-700">
                              <li>• <strong>Standard:</strong> 24 hours before appointment</li>
                              <li>• <strong>High-value:</strong> 48-72 hours (give time to plan)</li>
                              <li>• <strong>Same-day:</strong> 2-4 hours before (last reminder)</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">2. Call Window</h5>
                            <ul className="text-sm space-y-1 text-green-700">
                              <li>• <strong>Business hours:</strong> 9 AM - 6 PM (respectful)</li>
                              <li>• <strong>Avoid:</strong> Early mornings, late evenings, Sundays</li>
                              <li>• <strong>Best times:</strong> 10 AM - 12 PM, 2 PM - 5 PM</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">3. Follow-Up Strategy</h5>
                            <ul className="text-sm space-y-1 text-green-700">
                              <li>• <strong>No answer:</strong> Try once more after 90 minutes</li>
                              <li>• <strong>Voicemail:</strong> Leave detailed message with callback</li>
                              <li>• <strong>Failed call:</strong> Alert staff for manual follow-up</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Script Optimization Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-semibold mb-3 text-green-700">✓ High-Converting Scripts Include:</h5>
                          <div className="space-y-2">
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <strong className="text-sm text-green-800">Personal Greeting</strong>
                              <p className="text-xs text-green-600">"Hi [Name], this is [Your Business]"</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <strong className="text-sm text-green-800">Specific Details</strong>
                              <p className="text-xs text-green-600">Date, time, service, provider name</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <strong className="text-sm text-green-800">Easy Action</strong>
                              <p className="text-xs text-green-600">"Reply YES to confirm or call us to reschedule"</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <strong className="text-sm text-green-800">Helpful Info</strong>
                              <p className="text-xs text-green-600">Parking directions, what to bring, prep instructions</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <strong className="text-sm text-green-800">Contact Option</strong>
                              <p className="text-xs text-green-600">"Call us at [number] with any questions"</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-semibold mb-3 text-red-700">✗ Avoid These Mistakes:</h5>
                          <div className="space-y-2">
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <strong className="text-sm text-red-800">Too Formal/Robotic</strong>
                              <p className="text-xs text-red-600">"This is an automated reminder regarding..."</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <strong className="text-sm text-red-800">Missing Key Details</strong>
                              <p className="text-xs text-red-600">No date, time, or location mentioned</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <strong className="text-sm text-red-800">No Clear Action</strong>
                              <p className="text-xs text-red-600">Customer doesn't know what to do next</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <strong className="text-sm text-red-800">Too Long</strong>
                              <p className="text-xs text-red-600">More than 30 seconds (people hang up)</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <strong className="text-sm text-red-800">Generic Message</strong>
                              <p className="text-xs text-red-600">No personalization, sounds mass-produced</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Alert className="mt-4">
                        <i className="fas fa-lightbulb"></i>
                        <AlertTitle>Pro Formula for 40% Higher Response Rates</AlertTitle>
                        <AlertDescription>
                          <strong>Personal + Clear + Actionable + Helpful = Success</strong>
                          <p className="mt-2 text-sm">
                            Example: "Hi Sarah, this is Lisa from Sunshine Spa! Just confirming your massage appointment tomorrow (Thursday) at 10 AM. We're located at 123 Main Street—free parking in back. Please arrive 5 minutes early to fill out your preference card. Reply YES to confirm or call us at 555-0123 to reschedule. Can't wait to see you!"
                          </p>
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Add Arrival Directions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3">Help customers find you easily by adding travel and parking directions to your voice messages:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <strong className="text-blue-800">📍 Location Tips</strong>
                          <ul className="text-sm text-blue-700 mt-2 space-y-1">
                            <li>• "We're on the 2nd floor, Suite 205"</li>
                            <li>• "Enter through the main lobby"</li>
                            <li>• "Look for the blue awning"</li>
                            <li>• "Next to Starbucks on Main Street"</li>
                          </ul>
                        </div>
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <strong className="text-green-800">🚗 Parking Instructions</strong>
                          <ul className="text-sm text-green-700 mt-2 space-y-1">
                            <li>• "Free parking in back lot"</li>
                            <li>• "Validated parking in building garage"</li>
                            <li>• "Street parking available (metered)"</li>
                            <li>• "Drop-off zone at front entrance"</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reduce-noshows">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Effective Strategies to Target 40-60% No-Show Reduction</CardTitle>
                  <CardDescription>
                    Real-world tactics that deliver measurable results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
                    <i className="fas fa-trophy text-green-600"></i>
                    <AlertTitle className="text-green-800">Industry Benchmark: 40-60% No-Show Reduction</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <strong>Our most successful clients typically see 40-60% reduction in no-shows within 30 days.</strong> The key is consistent application of these effective strategies.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-clock mr-2"></i>
                          Strategy #1: Perfect Timing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded">
                          <strong className="text-blue-800">48-Hour Advance Notice</strong>
                          <p className="text-sm text-blue-700 mt-1">Gives customers time to plan or reschedule. <strong>Reduces no-shows by 30%.</strong></p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded">
                          <strong className="text-blue-800">24-Hour Reminder</strong>
                          <p className="text-sm text-blue-700 mt-1">Second reminder catches those who forgot. <strong>Additional 15% reduction.</strong></p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded">
                          <strong className="text-blue-800">Morning-Of Reminder</strong>
                          <p className="text-sm text-blue-700 mt-1">Final reminder for same-day appointments. <strong>Catches 5% more.</strong></p>
                        </div>
                        <div className="text-center mt-3 p-2 bg-blue-100 rounded">
                          <strong className="text-blue-800">Total Impact: ~50% Reduction</strong>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-user-friends mr-2"></i>
                          Strategy #2: Personalization
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 bg-green-50 rounded">
                          <strong className="text-green-800">Use Customer Names</strong>
                          <p className="text-sm text-green-700 mt-1">"Hi Sarah" feels personal, not automated. <strong>25% better response.</strong></p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <strong className="text-green-800">Mention Provider Name</strong>
                          <p className="text-sm text-green-700 mt-1">"Your appointment with Dr. Smith" creates connection. <strong>18% improvement.</strong></p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <strong className="text-green-800">Reference Past Visits</strong>
                          <p className="text-sm text-green-700 mt-1">"Looking forward to seeing you again!" builds loyalty. <strong>12% boost.</strong></p>
                        </div>
                        <div className="text-center mt-3 p-2 bg-green-100 rounded">
                          <strong className="text-green-800">Total Impact: ~55% More Engagement</strong>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-800">
                          <i className="fas fa-redo mr-2"></i>
                          Strategy #3: Easy Rescheduling
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 bg-purple-50 rounded">
                          <strong className="text-purple-800">One-Click Reschedule</strong>
                          <p className="text-sm text-purple-700 mt-1">Make it easy—they'll reschedule instead of no-showing. <strong>40% fewer no-shows.</strong></p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded">
                          <strong className="text-purple-800">No Penalties</strong>
                          <p className="text-sm text-purple-700 mt-1">Encourage rescheduling vs. missing. <strong>35% convert to new appointments.</strong></p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded">
                          <strong className="text-purple-800">Suggest Alternatives</strong>
                          <p className="text-sm text-purple-700 mt-1">"Can't make it? Reply with a better time." <strong>28% take action.</strong></p>
                        </div>
                        <div className="text-center mt-3 p-2 bg-purple-100 rounded">
                          <strong className="text-purple-800">Total Impact: ~60% Rescued Appointments</strong>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-yellow-50 border-yellow-300">
                    <CardHeader>
                      <CardTitle className="text-yellow-900">The Ultimate No-Show Prevention Workflow</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <Badge className="mt-1 bg-yellow-600">Step 1</Badge>
                          <div>
                            <strong className="text-yellow-900">72 Hours Before:</strong>
                            <p className="text-sm text-yellow-800">Initial reminder for high-value appointments. "Looking forward to your appointment!"</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Badge className="mt-1 bg-yellow-600">Step 2</Badge>
                          <div>
                            <strong className="text-yellow-900">24 Hours Before:</strong>
                            <p className="text-sm text-yellow-800">Standard reminder with details. Include parking/directions. Offer easy rescheduling.</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Badge className="mt-1 bg-yellow-600">Step 3</Badge>
                          <div>
                            <strong className="text-yellow-900">2 Hours Before:</strong>
                            <p className="text-sm text-yellow-800">Final reminder for same-day appointments. "See you in 2 hours!"</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Badge className="mt-1 bg-yellow-600">Step 4</Badge>
                          <div>
                            <strong className="text-yellow-900">If No Answer:</strong>
                            <p className="text-sm text-yellow-800">Auto-retry after 90 minutes. Leave voicemail with callback number.</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Badge className="mt-1 bg-yellow-600">Step 5</Badge>
                          <div>
                            <strong className="text-yellow-900">Post-Appointment:</strong>
                            <p className="text-sm text-yellow-800">Thank you message. Request feedback. Book next appointment.</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-800">
                          <i className="fas fa-check-circle mr-2"></i>
                          What Works Best
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>✓ <strong>Multiple touchpoints:</strong> 2-3 reminders minimum</li>
                          <li>✓ <strong>Personal tone:</strong> Friendly, not robotic</li>
                          <li>✓ <strong>Clear value:</strong> Remind them why they booked</li>
                          <li>✓ <strong>Easy actions:</strong> One-click confirm/reschedule</li>
                          <li>✓ <strong>Helpful details:</strong> Parking, directions, what to bring</li>
                          <li>✓ <strong>Respectful timing:</strong> Business hours only</li>
                          <li>✓ <strong>Follow-up:</strong> Retry no-answers automatically</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-800">
                          <i className="fas fa-times-circle mr-2"></i>
                          Common Mistakes to Avoid
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li>✗ <strong>Only one reminder:</strong> Not enough touchpoints</li>
                          <li>✗ <strong>Too early:</strong> 7+ days before (they forget again)</li>
                          <li>✗ <strong>Too late:</strong> Only same-day (no time to plan)</li>
                          <li>✗ <strong>No follow-up:</strong> Giving up after one try</li>
                          <li>✗ <strong>Generic message:</strong> Sounds like spam</li>
                          <li>✗ <strong>Hard to reschedule:</strong> Creates no-shows</li>
                          <li>✗ <strong>Wrong timing:</strong> Calling at 8 PM or 7 AM</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <i className="fas fa-calculator"></i>
                    <AlertTitle>Calculate Your Potential ROI</AlertTitle>
                    <AlertDescription>
                      <div className="mt-3 space-y-2">
                        <p><strong>Sample Calculation (for illustration):</strong></p>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Baseline no-show rate: 20% (100 monthly appointments = 20 no-shows)</li>
                          <li>• Average appointment value: $150</li>
                          <li>• Current monthly loss: 20 × $150 = $3,000</li>
                          <li>• Potential improvement (40-50% reduction): 8-10 fewer no-shows</li>
                          <li>• <strong className="text-green-700">Potential monthly value: $1,200-$1,500</strong></li>
                          <li>• <strong className="text-green-700">Potential annual value: $14,400-$18,000</strong></li>
                        </ul>
                        <p className="text-sm mt-3 p-2 bg-green-100 rounded">
                          <strong>Your Results:</strong> Calculate using your own numbers (appointment volume × average value × expected reduction rate). Results vary widely based on industry, implementation quality, and baseline metrics.
                        </p>
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
                  <CardTitle>Analytics & Performance Tracking</CardTitle>
                  <CardDescription>
                    Measure results, identify opportunities, and prove ROI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-300">
                    <i className="fas fa-chart-line text-blue-600"></i>
                    <AlertTitle className="text-blue-800">Data-Driven Success</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      <strong>What gets measured gets managed.</strong> Monitor these key metrics daily to optimize your appointment operations and maximize revenue.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-tachometer-alt mr-2"></i>
                          Essential Metrics to Track Daily
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-white rounded border border-green-200">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-green-800">Call Success Rate</strong>
                              <Badge className="bg-green-600">Target: 85%+</Badge>
                            </div>
                            <p className="text-sm text-green-700">Percentage of calls that connect successfully. Low rate indicates phone number issues.</p>
                          </div>
                          
                          <div className="p-3 bg-white rounded border border-green-200">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-green-800">Confirmation Rate</strong>
                              <Badge className="bg-green-600">Target: 70%+</Badge>
                            </div>
                            <p className="text-sm text-green-700">How many customers confirm their appointment. Core indicator of reminder effectiveness.</p>
                          </div>
                          
                          <div className="p-3 bg-white rounded border border-green-200">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-green-800">No-Show Reduction</strong>
                              <Badge className="bg-green-600">Target: 40-60%</Badge>
                            </div>
                            <p className="text-sm text-green-700">Improvement vs. baseline. This is your primary ROI metric.</p>
                          </div>
                          
                          <div className="p-3 bg-white rounded border border-green-200">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-green-800">Reschedule Rate</strong>
                              <Badge className="bg-green-600">Target: 20%+</Badge>
                            </div>
                            <p className="text-sm text-green-700">Customers who reschedule instead of no-showing. Higher is better.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-800">
                          <i className="fas fa-chart-pie mr-2"></i>
                          Understanding Your Dashboard
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Today's Schedule</h5>
                            <p className="text-sm text-purple-700">Upcoming appointments, pending confirmations, and at-risk customers who need follow-up.</p>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Call Activity</h5>
                            <p className="text-sm text-purple-700">Real-time view of calls in progress, completed, and scheduled. Track your voice AI's performance.</p>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Items Requiring Attention</h5>
                            <p className="text-sm text-purple-700">Failed calls, unconfirmed appointments (24h window), and customers with no-show history.</p>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Performance Trends</h5>
                            <p className="text-sm text-purple-700">Week-over-week and month-over-month comparisons. Identify patterns and seasonal changes.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>How to Use Daily Email Summaries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">Receive actionable insights delivered to your inbox every morning:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2">
                            <i className="fas fa-check-circle mr-2"></i>
                            Recently Confirmed
                          </h5>
                          <p className="text-sm text-green-700">See who confirmed yesterday. These appointments are solid—focus elsewhere.</p>
                          <p className="text-xs text-green-600 mt-2">Shows up to 10 contacts with names and appointment times</p>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                          <h5 className="font-semibold text-yellow-800 mb-2">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            No Answer (Follow-Up Needed)
                          </h5>
                          <p className="text-sm text-yellow-700">These customers didn't pick up. Prioritize manual follow-up today.</p>
                          <p className="text-xs text-yellow-600 mt-2">Call them personally or send a text</p>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded border border-red-200">
                          <h5 className="font-semibold text-red-800 mb-2">
                            <i className="fas fa-phone-slash mr-2"></i>
                            Failed Calls
                          </h5>
                          <p className="text-sm text-red-700">Technical issues or wrong numbers. Update contact info and retry.</p>
                          <p className="text-xs text-red-600 mt-2">Fix immediately to prevent no-shows</p>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                        <strong className="text-blue-800">⚙️ Configure Your Summary</strong>
                        <p className="text-sm text-blue-700 mt-2">Go to Settings → Email Preferences to:</p>
                        <ul className="text-sm text-blue-700 mt-1 ml-4 space-y-1">
                          <li>• Set delivery time (e.g., 8 AM in your timezone)</li>
                          <li>• Choose which sections to include</li>
                          <li>• Add team members to receive copies</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Checklist (Weekly Review)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <strong>Review Call Success Rate</strong>
                            <p className="text-sm text-muted-foreground">If below 85%, check for phone number issues or time zone problems</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <strong>Analyze Confirmation Patterns</strong>
                            <p className="text-sm text-muted-foreground">Which days/times get best responses? Adjust call timing accordingly</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <strong>Compare to Last Month</strong>
                            <p className="text-sm text-muted-foreground">Are no-shows trending down? If not, adjust your reminder strategy</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <strong>Identify At-Risk Customers</strong>
                            <p className="text-sm text-muted-foreground">Track repeat no-showers and create a special follow-up protocol</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <input type="checkbox" className="mt-1" />
                          <div>
                            <strong>Calculate Revenue Impact</strong>
                            <p className="text-sm text-muted-foreground">Track recovered appointments × average value = ROI to share with team</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <i className="fas fa-trophy"></i>
                    <AlertTitle>Success Benchmarks (First 90 Days)</AlertTitle>
                    <AlertDescription>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div className="text-center p-3 bg-green-50 rounded">
                          <div className="text-2xl font-bold text-green-700">40-60%</div>
                          <div className="text-xs text-green-600">No-Show Reduction</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded">
                          <div className="text-2xl font-bold text-blue-700">85%+</div>
                          <div className="text-xs text-blue-600">Call Success Rate</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded">
                          <div className="text-2xl font-bold text-purple-700">70%+</div>
                          <div className="text-xs text-purple-600">Confirmation Rate</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded">
                          <div className="text-2xl font-bold text-orange-700">$15K+</div>
                          <div className="text-xs text-orange-600">Revenue Recovered</div>
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
                  <CardTitle>Advanced Features & Pro Tips</CardTitle>
                  <CardDescription>
                    Power user strategies to maximize platform capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-800">
                          <i className="fas fa-calendar-check mr-2"></i>
                          Calendar Integration Mastery
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Cal.com Setup</h5>
                            <ol className="text-sm text-purple-700 space-y-1">
                              <li>1. Go to Integrations → Connect Cal.com</li>
                              <li>2. Authorize webhook access</li>
                              <li>3. Select event types to sync</li>
                              <li>4. Enable reschedule detection</li>
                              <li>5. Test with sample booking</li>
                            </ol>
                          </div>
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Calendly Setup</h5>
                            <ol className="text-sm text-purple-700 space-y-1">
                              <li>1. Go to Integrations → Connect Calendly</li>
                              <li>2. Enter API key (from Calendly settings)</li>
                              <li>3. Choose which event types sync</li>
                              <li>4. Set up webhook signature</li>
                              <li>5. Appointments auto-import instantly</li>
                            </ol>
                          </div>
                          <Alert className="bg-purple-100 border-purple-300 mt-3">
                            <AlertDescription className="text-purple-800 text-sm">
                              <strong>Pro Tip:</strong> Both integrations detect rescheduling automatically, preventing duplicate reminder calls.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-users-cog mr-2"></i>
                          Team Management Best Practices
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">Invite Team Members</h5>
                            <ol className="text-sm text-blue-700 space-y-1">
                              <li>1. Go to Team Management</li>
                              <li>2. Click "Invite Team Member"</li>
                              <li>3. Enter email and choose role:</li>
                              <li className="ml-4">• <strong>Client Admin:</strong> Full access, can manage team</li>
                              <li className="ml-4">• <strong>Client User:</strong> View-only, can't change settings</li>
                              <li>4. They receive secure invitation link</li>
                              <li>5. Track login activity in Audit Trail</li>
                            </ol>
                          </div>
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">Security Best Practices</h5>
                            <ul className="text-sm text-blue-700 space-y-1">
                              <li>• Limit Admin access to trusted staff</li>
                              <li>• Deactivate users when they leave</li>
                              <li>• Review audit trail monthly</li>
                              <li>• Use strong, unique passwords</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Data Export & Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-semibold mb-3 text-green-700">Export Your Data</h5>
                          <div className="space-y-2">
                            <div className="p-3 bg-green-50 rounded border border-green-200">
                              <strong className="text-green-800">CSV Exports (Reporting)</strong>
                              <ul className="text-sm text-green-700 mt-1 space-y-1">
                                <li>• Contact database</li>
                                <li>• Appointment history</li>
                                <li>• Call logs and outcomes</li>
                                <li>• Audit trail (compliance)</li>
                              </ul>
                            </div>
                            <div className="p-3 bg-blue-50 rounded border border-blue-200">
                              <strong className="text-blue-800">JSON Export (GDPR)</strong>
                              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                <li>• Full data export for compliance</li>
                                <li>• GDPR Article 20 compliant</li>
                                <li>• Customer data portability</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-semibold mb-3 text-purple-700">Compliance Features</h5>
                          <div className="space-y-2">
                            <div className="p-3 bg-purple-50 rounded border border-purple-200">
                              <strong className="text-purple-800">Audit Trail</strong>
                              <p className="text-sm text-purple-700 mt-1">Every action logged with timestamp, user, and details. 7-year retention for compliance.</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded border border-purple-200">
                              <strong className="text-purple-800">Privacy Controls</strong>
                              <p className="text-sm text-purple-700 mt-1">Data deletion, opt-out management, consent tracking all built-in.</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded border border-purple-200">
                              <strong className="text-purple-800">Data Isolation</strong>
                              <p className="text-sm text-purple-700 mt-1">Your data is completely separated. Bank-level encryption and security.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Troubleshooting Common Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-4 bg-orange-50 rounded border border-orange-200">
                          <div className="flex items-start space-x-3">
                            <i className="fas fa-exclamation-triangle text-orange-600 mt-1"></i>
                            <div className="flex-1">
                              <strong className="text-orange-800">Issue: Low Call Success Rate (below 80%)</strong>
                              <p className="text-sm text-orange-700 mt-1"><strong>Solutions:</strong></p>
                              <ul className="text-sm text-orange-700 mt-1 space-y-1">
                                <li>• Verify phone numbers are correct (mobile preferred)</li>
                                <li>• Check call timing isn't too early/late</li>
                                <li>• Ensure phone numbers include country code</li>
                                <li>• Remove inactive or disconnected numbers</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-red-50 rounded border border-red-200">
                          <div className="flex items-start space-x-3">
                            <i className="fas fa-times-circle text-red-600 mt-1"></i>
                            <div className="flex-1">
                              <strong className="text-red-800">Issue: High No-Show Rate (still above 15%)</strong>
                              <p className="text-sm text-red-700 mt-1"><strong>Solutions:</strong></p>
                              <ul className="text-sm text-red-700 mt-1 space-y-1">
                                <li>• Add earlier reminder (48 hours before)</li>
                                <li>• Make rescheduling easier (one-click option)</li>
                                <li>• Personalize voice scripts more</li>
                                <li>• Check voice tone matches your brand</li>
                                <li>• Enable missed call follow-ups</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                          <div className="flex items-start space-x-3">
                            <i className="fas fa-phone-slash text-yellow-600 mt-1"></i>
                            <div className="flex-1">
                              <strong className="text-yellow-800">Issue: Customers Complaining About Timing</strong>
                              <p className="text-sm text-yellow-700 mt-1"><strong>Solutions:</strong></p>
                              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                                <li>• Adjust business hours in settings</li>
                                <li>• Respect customer time zones</li>
                                <li>• Avoid calling during meals (12-1 PM, 5-7 PM)</li>
                                <li>• Test different call windows for your audience</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-start space-x-3">
                            <i className="fas fa-question-circle text-blue-600 mt-1"></i>
                            <div className="flex-1">
                              <strong className="text-blue-800">Need More Help?</strong>
                              <p className="text-sm text-blue-700 mt-1">Access in-platform support:</p>
                              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                <li>• Click the ? icon in header for contextual help</li>
                                <li>• Check your email for training resources</li>
                                <li>• Review analytics for optimization insights</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
                    <i className="fas fa-rocket text-green-600"></i>
                    <AlertTitle className="text-green-800">Your Success is Our Success</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="mb-2">
                        <strong>You're now equipped to reduce no-shows by 40-60% and recover thousands in lost revenue.</strong> Remember:
                      </p>
                      <ul className="space-y-1">
                        <li>• Start with quality contact data</li>
                        <li>• Use multiple reminder touchpoints (48h, 24h, same-day)</li>
                        <li>• Make rescheduling easy (prevents no-shows)</li>
                        <li>• Monitor your analytics daily</li>
                        <li>• Optimize based on what your data shows</li>
                      </ul>
                      <p className="mt-3 font-semibold">
                        Most clients see measurable results within 30 days. Let's make your business more profitable! 🎉
                      </p>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
