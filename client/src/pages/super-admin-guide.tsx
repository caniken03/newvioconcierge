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

export default function SuperAdminGuide() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="container mx-auto max-w-6xl" data-testid="super-admin-guide">
            <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <i className="fas fa-crown mr-3 text-yellow-500"></i>
            Super Admin User Guide
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Master the VioConcierge platform with comprehensive insights, best practices, and real-world strategies for maximum efficiency.
          </p>
          <Alert className="mb-6">
            <i className="fas fa-lightbulb"></i>
            <AlertTitle>Platform Mastery</AlertTitle>
            <AlertDescription>
              This guide provides actionable insights and proven strategies used by successful platform administrators to maximize tenant satisfaction and operational efficiency.
            </AlertDescription>
          </Alert>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenant-mgmt">Tenant Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Insights</TabsTrigger>
            <TabsTrigger value="system-health">System Health</TabsTrigger>
            <TabsTrigger value="compliance">Compliance & Security</TabsTrigger>
            <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview & Your Role</CardTitle>
                <CardDescription>
                  Understanding your responsibilities and the strategic impact of your decisions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <i className="fas fa-telescope mr-2"></i>
                        Strategic Oversight
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3">As a Super Admin, you're the platform architect responsible for:</p>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Tenant Success:</strong> Ensuring each business maximizes their appointment efficiency</li>
                        <li>• <strong>Platform Health:</strong> Maintaining 99.9% uptime and optimal performance</li>
                        <li>• <strong>Strategic Growth:</strong> Identifying expansion opportunities and feature needs</li>
                        <li>• <strong>Quality Assurance:</strong> Monitoring voice AI quality and customer satisfaction</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <i className="fas fa-chart-line mr-2"></i>
                        Impact Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3">Key performance indicators you directly influence:</p>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>No-Show Reduction:</strong> Target 40-60% reduction across tenants</li>
                        <li>• <strong>Customer Satisfaction:</strong> Maintain 4.5+ star ratings for voice interactions</li>
                        <li>• <strong>Operational Efficiency:</strong> 85%+ automated rescheduling success rate</li>
                        <li>• <strong>Platform Reliability:</strong> Sub-2-minute response times for critical actions</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <i className="fas fa-star text-yellow-600"></i>
                  <AlertTitle className="text-yellow-800">Success Story Example</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    <strong>Dental Practice Chain (6 locations):</strong> Implemented VioConcierge with custom HIPAA-compliant voice scripts. Result: 52% reduction in no-shows, $180K annual revenue recovery, 94% patient satisfaction with voice reminders.
                    <br /><br />
                    <strong>Key Insight:</strong> Personalized voice tone matching (warm, professional) + 48-hour advance reminders + easy rescheduling options = maximum effectiveness.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tenant-mgmt">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Tenant Management Strategies</CardTitle>
                  <CardDescription>
                    Transform businesses with data-driven onboarding and optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-base text-blue-800">
                          <i className="fas fa-rocket mr-2"></i>
                          Strategic Onboarding
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <Badge variant="outline" className="mb-2">Week 1</Badge>
                            <p className="text-sm"><strong>Discovery & Setup:</strong> Analyze current no-show rates, identify peak cancellation periods, configure initial voice scripts</p>
                          </div>
                          <div>
                            <Badge variant="outline" className="mb-2">Week 2-3</Badge>
                            <p className="text-sm"><strong>Optimization:</strong> A/B test reminder timing, refine voice tone based on demographics, integrate calendar systems</p>
                          </div>
                          <div>
                            <Badge variant="outline" className="mb-2">Week 4+</Badge>
                            <p className="text-sm"><strong>Advanced Features:</strong> Enable automated rescheduling, implement follow-up workflows, set up analytics dashboards</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-base text-green-800">
                          <i className="fas fa-bullseye mr-2"></i>
                          Industry Specialization
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <strong className="text-sm text-green-700">Healthcare:</strong>
                            <p className="text-xs">HIPAA compliance, medical terminology, 72-hour advance reminders, urgent appointment prioritization</p>
                          </div>
                          <div>
                            <strong className="text-sm text-green-700">Beauty/Wellness:</strong>
                            <p className="text-xs">Personalized service reminders, seasonal promotions, same-day booking confirmations, upselling opportunities</p>
                          </div>
                          <div>
                            <strong className="text-sm text-green-700">Professional Services:</strong>
                            <p className="text-xs">Business hours respect, meeting preparation reminders, client document requests, follow-up scheduling</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-base text-purple-800">
                          <i className="fas fa-cogs mr-2"></i>
                          Feature Optimization
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <strong className="text-sm text-purple-700">Premium Features:</strong>
                            <p className="text-xs">Custom branding, advanced analytics, priority support, API access - Enable based on business size and needs</p>
                          </div>
                          <div>
                            <strong className="text-sm text-purple-700">Voice AI Settings:</strong>
                            <p className="text-xs">Accent matching, speaking pace, hold music, callback preferences - Critical for customer experience</p>
                          </div>
                          <div>
                            <strong className="text-sm text-purple-700">Integration Priority:</strong>
                            <p className="text-xs">Cal.com → Calendly → Manual import. Start with highest-volume calendar system first</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <i className="fas fa-lightbulb text-blue-600"></i>
                    <AlertTitle className="text-blue-800">Pro Tip: The 7-Step Tenant Success Framework</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li><strong>Business Discovery:</strong> Current pain points, appointment volume, customer demographics</li>
                        <li><strong>Template Selection:</strong> Choose industry template that reduces setup time by 70%</li>
                        <li><strong>Feature Enablement:</strong> Start with core features, scale up based on adoption</li>
                        <li><strong>Admin Setup:</strong> Train 2+ staff members for redundancy</li>
                        <li><strong>Integration Configuration:</strong> Connect their most-used calendar system first</li>
                        <li><strong>Business Configuration:</strong> Voice scripts, timing, branding alignment</li>
                        <li><strong>Go-Live & Monitor:</strong> 2-week intensive monitoring with weekly optimization reviews</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tenant Lifecycle Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-green-700">High-Performing Tenants (Retention Focus)</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Monthly strategy calls to identify expansion opportunities</li>
                        <li>• Early access to beta features and advanced analytics</li>
                        <li>• Quarterly business reviews with ROI reporting</li>
                        <li>• Referral program incentives for new tenant introductions</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-yellow-700">Struggling Tenants (Intervention Required)</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Root cause analysis: technical vs. adoption issues</li>
                        <li>• Additional training sessions for staff</li>
                        <li>• Simplified feature set to reduce complexity</li>
                        <li>• Success manager assignment for 90-day intensive support</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Analytics & Strategic Insights</CardTitle>
                  <CardDescription>
                    Transform data into actionable business intelligence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-chart-bar mr-2"></i>
                          Cross-Tenant Intelligence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">Performance Benchmarking</h5>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Industry Averages:</strong> Compare tenant performance against industry peers</li>
                              <li>• <strong>Seasonal Patterns:</strong> Identify peak/low periods for proactive support</li>
                              <li>• <strong>Feature Adoption:</strong> Track which features drive the best outcomes</li>
                              <li>• <strong>Voice Quality Scores:</strong> Monitor customer satisfaction trends</li>
                            </ul>
                          </div>
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <p className="text-xs text-blue-600">
                              <strong>Example Insight:</strong> Tenants using automated rescheduling have 23% higher customer satisfaction and 31% better no-show reduction than manual-only tenants.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-800">
                          <i className="fas fa-magnifying-glass-chart mr-2"></i>
                          Predictive Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-green-700 mb-2">Early Warning System</h5>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Churn Risk:</strong> Identify tenants at risk 30 days before cancellation</li>
                              <li>• <strong>Growth Opportunities:</strong> Predict which tenants are ready for premium features</li>
                              <li>• <strong>Technical Issues:</strong> Proactive monitoring before problems impact customers</li>
                              <li>• <strong>Capacity Planning:</strong> Forecast infrastructure needs</li>
                            </ul>
                          </div>
                          <div className="bg-white p-3 rounded border border-green-200">
                            <p className="text-xs text-green-600">
                              <strong>Action Example:</strong> When call success rate drops below 85% for 3 consecutive days, automatically create support ticket and notify tenant admin.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <i className="fas fa-trophy"></i>
                    <AlertTitle>Success Metrics to Track Daily</AlertTitle>
                    <AlertDescription>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">94.2%</div>
                          <div className="text-xs text-muted-foreground">Platform Uptime</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">-47%</div>
                          <div className="text-xs text-muted-foreground">Avg No-Show Reduction</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">4.6★</div>
                          <div className="text-xs text-muted-foreground">Customer Satisfaction</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">1.8s</div>
                          <div className="text-xs text-muted-foreground">Avg Response Time</div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Intelligence & Growth Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                        <h5 className="font-semibold text-emerald-800 mb-2">Upsell Opportunities</h5>
                        <ul className="text-sm space-y-1 text-emerald-700">
                          <li>• High-volume tenants ready for premium features</li>
                          <li>• Successful tenants expanding to multiple locations</li>
                          <li>• Integration requests indicating growth</li>
                        </ul>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-semibold text-blue-800 mb-2">Feature Adoption</h5>
                        <ul className="text-sm space-y-1 text-blue-700">
                          <li>• Which features drive highest retention</li>
                          <li>• Underutilized capabilities with high ROI</li>
                          <li>• Training gaps leading to poor adoption</li>
                        </ul>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h5 className="font-semibold text-purple-800 mb-2">Market Intelligence</h5>
                        <ul className="text-sm space-y-1 text-purple-700">
                          <li>• Industry-specific performance patterns</li>
                          <li>• Competitive feature requests</li>
                          <li>• Emerging customer needs</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system-health">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health & Performance Optimization</CardTitle>
                  <CardDescription>
                    Proactive monitoring and optimization strategies for platform excellence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-l-4 border-l-red-500">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          <i className="fas fa-heartbeat mr-2 text-red-500"></i>
                          Critical Health Indicators
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <strong className="text-red-800">Call Success Rate &lt; 90%</strong>
                            <p className="text-sm text-red-700 mt-1">Immediate investigation required. Check Retell AI integration, network connectivity, webhook processing.</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <strong className="text-orange-800">Response Time &gt; 3 seconds</strong>
                            <p className="text-sm text-orange-700 mt-1">Performance degradation. Review database queries, cache efficiency, API rate limits.</p>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <strong className="text-yellow-800">Memory Usage &gt; 80%</strong>
                            <p className="text-sm text-yellow-700 mt-1">Scale preparation needed. Monitor for memory leaks, optimize data processing.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          <i className="fas fa-shield-alt mr-2 text-green-500"></i>
                          Preventive Measures
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <strong className="text-green-800 text-sm">Daily Health Checks</strong>
                            <ul className="text-xs text-green-700 mt-1 space-y-1">
                              <li>• Verify webhook signatures and processing</li>
                              <li>• Check voice AI response quality samples</li>
                              <li>• Monitor database connection pools</li>
                              <li>• Validate external API rate limits</li>
                            </ul>
                          </div>
                          <div>
                            <strong className="text-green-800 text-sm">Weekly Optimization</strong>
                            <ul className="text-xs text-green-700 mt-1 space-y-1">
                              <li>• Review slow query reports</li>
                              <li>• Analyze tenant usage patterns</li>
                              <li>• Update voice AI training data</li>
                              <li>• Optimize cache strategies</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <i className="fas fa-tools text-blue-600"></i>
                    <AlertTitle className="text-blue-800">Incident Response Playbook</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <strong>Severity 1 (Critical)</strong>
                          <p className="text-xs mt-1">Platform down, mass call failures</p>
                          <p className="text-xs"><strong>Response:</strong> Immediate escalation, tenant notifications, status page update</p>
                        </div>
                        <div>
                          <strong>Severity 2 (High)</strong>
                          <p className="text-xs mt-1">Feature degradation, isolated failures</p>
                          <p className="text-xs"><strong>Response:</strong> 2-hour investigation window, proactive tenant communication</p>
                        </div>
                        <div>
                          <strong>Severity 3 (Medium)</strong>
                          <p className="text-xs mt-1">Performance issues, minor bugs</p>
                          <p className="text-xs"><strong>Response:</strong> Next business day resolution, documentation update</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compliance">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance & Security Excellence</CardTitle>
                  <CardDescription>
                    Maintaining the highest standards for data protection and regulatory compliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-800">
                          <i className="fas fa-user-shield mr-2"></i>
                          HIPAA Compliance Framework
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-purple-700 mb-2">Healthcare Tenant Requirements</h5>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>PHI Encryption:</strong> All voice recordings encrypted at rest and in transit</li>
                              <li>• <strong>Access Controls:</strong> Role-based access with audit logging</li>
                              <li>• <strong>Data Retention:</strong> Automatic purging after regulatory periods</li>
                              <li>• <strong>Voice Scripts:</strong> Pre-approved medical terminology only</li>
                            </ul>
                          </div>
                          <Alert className="bg-purple-100 border-purple-300">
                            <AlertDescription className="text-purple-800 text-xs">
                              <strong>Critical:</strong> All healthcare tenants must complete BAA (Business Associate Agreement) before activation. Voice AI must use HIPAA-compliant Retell AI endpoints.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-800">
                          <i className="fas fa-lock mr-2"></i>
                          Security Monitoring
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-blue-700 mb-2">24/7 Threat Detection</h5>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Webhook Verification:</strong> HMAC-SHA256 signature validation</li>
                              <li>• <strong>Rate Limiting:</strong> Automated abuse protection</li>
                              <li>• <strong>Access Patterns:</strong> Anomaly detection for unusual behavior</li>
                              <li>• <strong>Data Integrity:</strong> Checksum validation for all transmissions</li>
                            </ul>
                          </div>
                          <Alert className="bg-blue-100 border-blue-300">
                            <AlertDescription className="text-blue-800 text-xs">
                              <strong>Best Practice:</strong> Review security logs weekly. Investigate any failed authentication attempts or unusual API access patterns immediately.
                            </AlertDescription>
                          </Alert>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Privacy & Data Protection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2">
                            <i className="fas fa-eraser mr-2"></i>
                            Data Minimization
                          </h5>
                          <ul className="text-sm space-y-1 text-green-700">
                            <li>• Collect only appointment-essential data</li>
                            <li>• Automatic PII redaction in logs</li>
                            <li>• Voice recording retention limits</li>
                            <li>• Anonymized analytics aggregation</li>
                          </ul>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h5 className="font-semibold text-orange-800 mb-2">
                            <i className="fas fa-user-check mr-2"></i>
                            Consent Management
                          </h5>
                          <ul className="text-sm space-y-1 text-orange-700">
                            <li>• Explicit opt-in for voice communications</li>
                            <li>• Easy opt-out mechanisms</li>
                            <li>• Consent audit trails</li>
                            <li>• Regional compliance adaptation</li>
                          </ul>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <h5 className="font-semibold text-red-800 mb-2">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            Incident Response
                          </h5>
                          <ul className="text-sm space-y-1 text-red-700">
                            <li>• 72-hour breach notification</li>
                            <li>• Affected tenant immediate alerts</li>
                            <li>• Forensic investigation protocols</li>
                            <li>• Regulatory reporting automation</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="best-practices">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Super Admin Best Practices & Success Strategies</CardTitle>
                  <CardDescription>
                    Proven methodologies from top-performing platform administrators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-amber-800">
                          <i className="fas fa-trophy mr-2"></i>
                          Platform Excellence Framework
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-amber-700 mb-2">The 90-Day Success Cycle</h5>
                            <div className="space-y-2">
                              <div className="flex items-start space-x-2">
                                <Badge variant="outline" className="mt-0.5">Days 1-30</Badge>
                                <div className="text-sm">
                                  <strong>Foundation:</strong> Tenant onboarding, system health baselines, initial optimization
                                </div>
                              </div>
                              <div className="flex items-start space-x-2">
                                <Badge variant="outline" className="mt-0.5">Days 31-60</Badge>
                                <div className="text-sm">
                                  <strong>Growth:</strong> Feature adoption campaigns, advanced training, performance tuning
                                </div>
                              </div>
                              <div className="flex items-start space-x-2">
                                <Badge variant="outline" className="mt-0.5">Days 61-90</Badge>
                                <div className="text-sm">
                                  <strong>Excellence:</strong> Strategic reviews, expansion planning, best practice sharing
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-emerald-800">
                          <i className="fas fa-users mr-2"></i>
                          Tenant Relationship Excellence
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-emerald-700 mb-2">Communication Mastery</h5>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Proactive Updates:</strong> Weekly performance summaries</li>
                              <li>• <strong>Educational Content:</strong> Monthly best practice webinars</li>
                              <li>• <strong>Strategic Guidance:</strong> Quarterly business reviews</li>
                              <li>• <strong>Issue Resolution:</strong> Same-day response for critical issues</li>
                            </ul>
                          </div>
                          <div className="bg-white p-3 rounded border border-emerald-200">
                            <p className="text-xs text-emerald-600">
                              <strong>Success Metric:</strong> Tenants with regular communication have 3x higher renewal rates and 40% better feature adoption.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <i className="fas fa-rocket text-purple-600"></i>
                    <AlertTitle className="text-purple-800">The Super Admin Success Formula</AlertTitle>
                    <AlertDescription className="text-purple-700">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">40%</div>
                          <div className="text-xs">Strategic Planning</div>
                          <div className="text-xs text-muted-foreground">Long-term vision, roadmap alignment</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">30%</div>
                          <div className="text-xs">Tenant Success</div>
                          <div className="text-xs text-muted-foreground">Onboarding, optimization, support</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">20%</div>
                          <div className="text-xs">System Health</div>
                          <div className="text-xs text-muted-foreground">Monitoring, optimization, scaling</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">10%</div>
                          <div className="text-xs">Innovation</div>
                          <div className="text-xs text-muted-foreground">Feature testing, market research</div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Optimization Strategies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h5 className="font-semibold mb-3">Voice AI Performance Optimization</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <strong className="text-blue-800 text-sm">Response Time Optimization</strong>
                              <ul className="text-xs text-blue-700 mt-2 space-y-1">
                                <li>• Pre-warm Retell AI connections during peak hours</li>
                                <li>• Cache frequently used voice scripts</li>
                                <li>• Optimize webhook processing with async queues</li>
                                <li>• Use CDN for static voice assets</li>
                              </ul>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <strong className="text-green-800 text-sm">Quality Enhancement</strong>
                              <ul className="text-xs text-green-700 mt-2 space-y-1">
                                <li>• A/B test voice personalities by demographics</li>
                                <li>• Implement sentiment analysis for call quality</li>
                                <li>• Use machine learning for optimal call timing</li>
                                <li>• Monitor background noise levels and adjust</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-semibold mb-3">Revenue Optimization Tactics</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <strong className="text-purple-800 text-sm">Upselling Strategies</strong>
                              <ul className="text-xs text-purple-700 mt-2 space-y-1">
                                <li>• Feature usage analytics dashboards</li>
                                <li>• ROI calculators for premium features</li>
                                <li>• Success story case studies</li>
                                <li>• Limited-time feature trials</li>
                              </ul>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                              <strong className="text-orange-800 text-sm">Retention Boosters</strong>
                              <ul className="text-xs text-orange-700 mt-2 space-y-1">
                                <li>• Predictive churn analysis</li>
                                <li>• Personalized success plans</li>
                                <li>• Multi-year discount programs</li>
                                <li>• Executive business reviews</li>
                              </ul>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <strong className="text-red-800 text-sm">Expansion Opportunities</strong>
                              <ul className="text-xs text-red-700 mt-2 space-y-1">
                                <li>• Multi-location tenant growth</li>
                                <li>• White-label partnership programs</li>
                                <li>• Industry-specific feature development</li>
                                <li>• Integration marketplace revenue</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
            </Tabs>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold text-blue-800 mb-2">Need Additional Support?</h3>
          <p className="text-blue-700 mb-4">
            As a Super Admin, you have access to exclusive resources and priority support channels.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <i className="fas fa-headset mr-2"></i>
              Priority Support
            </Button>
            <Button size="sm" variant="outline">
              <i className="fas fa-users mr-2"></i>
              Admin Community
            </Button>
            <Button size="sm" variant="outline">
              <i className="fas fa-book mr-2"></i>
              Advanced Documentation
            </Button>
            <Button size="sm" variant="outline">
              <i className="fas fa-video mr-2"></i>
              Training Resources
            </Button>
          </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}