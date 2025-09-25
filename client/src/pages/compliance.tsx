import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Eye, 
  Lock, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Download,
  Settings
} from "lucide-react";

export default function Compliance() {
  const { user } = useAuth();

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access compliance and security.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="compliance-page">
                  Compliance & Security
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitor compliance status, security controls, and regulatory requirements
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" data-testid="button-export-compliance-report">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                <Button variant="outline" data-testid="button-compliance-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>

            {/* Compliance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overall Compliance</p>
                      <p className="text-3xl font-bold text-foreground">94%</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-green-500">+2% vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Security Score</p>
                      <p className="text-3xl font-bold text-foreground">A+</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <Lock className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-green-500">Excellent</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Audits</p>
                      <p className="text-3xl font-bold text-foreground">3</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <Clock className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="text-sm font-medium text-orange-500">In progress</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Violations</p>
                      <p className="text-3xl font-bold text-foreground">2</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-sm font-medium text-red-500">Needs attention</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Regulatory Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Regulatory Compliance</span>
                  </CardTitle>
                  <CardDescription>Status of regulatory requirements and standards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">HIPAA Compliance</div>
                        <div className="text-sm text-muted-foreground">Health data protection standards</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Compliant
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">GDPR Compliance</div>
                        <div className="text-sm text-muted-foreground">European data protection regulation</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Compliant
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        !
                      </div>
                      <div>
                        <div className="font-medium">SOC 2 Type II</div>
                        <div className="text-sm text-muted-foreground">Security and availability controls</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      In Progress
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">CCPA Compliance</div>
                        <div className="text-sm text-muted-foreground">California consumer privacy act</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Compliant
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Security Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>Security Controls</span>
                  </CardTitle>
                  <CardDescription>Implementation status of security measures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">Data Encryption</div>
                        <div className="text-sm text-muted-foreground">At-rest and in-transit encryption</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">Access Controls</div>
                        <div className="text-sm text-muted-foreground">Role-based access management</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✗
                      </div>
                      <div>
                        <div className="font-medium">Multi-Factor Authentication</div>
                        <div className="text-sm text-muted-foreground">Additional authentication layer</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Missing
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">Audit Logging</div>
                        <div className="text-sm text-muted-foreground">Comprehensive activity tracking</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Violations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Recent Activity</span>
                    </span>
                  </CardTitle>
                  <CardDescription>Latest compliance and security events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">HIPAA audit completed</p>
                        <p className="text-sm text-green-600">All requirements passed successfully</p>
                        <p className="text-xs text-green-500 mt-1">2 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Eye className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-800">Security scan initiated</p>
                        <p className="text-sm text-blue-600">Automated vulnerability assessment started</p>
                        <p className="text-xs text-blue-500 mt-1">1 day ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-orange-800">Policy update required</p>
                        <p className="text-sm text-orange-600">Data retention policy needs review</p>
                        <p className="text-xs text-orange-500 mt-1">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Active Issues</span>
                    </span>
                    <Badge variant="destructive">2</Badge>
                  </CardTitle>
                  <CardDescription>Items requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-800">MFA not enforced</p>
                        <p className="text-sm text-red-600">Multi-factor authentication is not required for all admin users</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-red-500">High Priority</p>
                          <Button size="sm" variant="outline" className="h-6 text-xs">
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-800">Certificate expiring</p>
                        <p className="text-sm text-yellow-600">SSL certificate expires in 14 days</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-yellow-500">Medium Priority</p>
                          <Button size="sm" variant="outline" className="h-6 text-xs">
                            Renew
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 text-center text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">No other issues detected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}