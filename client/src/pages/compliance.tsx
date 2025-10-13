import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
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
  Settings,
  Loader2
} from "lucide-react";

export default function Compliance() {
  const { user } = useAuth();
  
  // Fetch compliance overview data
  const { data: complianceData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/compliance/overview'],
    enabled: user?.role === 'super_admin',
  });

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Overall Compliance</p>
                          <p className="text-3xl font-bold text-foreground" data-testid="text-compliance-score">
                            {complianceData?.complianceScore || 0}%
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
                          <Shield className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex items-center mt-4">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm font-medium text-green-500">
                          {complianceData?.complianceScore >= 75 ? 'Good standing' : 'Needs improvement'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Security Score</p>
                          <p className="text-3xl font-bold text-foreground" data-testid="text-security-grade">
                            {complianceData?.securityGrade || 'N/A'}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                          <Lock className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex items-center mt-4">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm font-medium text-green-500">
                          {complianceData?.securityGrade === 'A+' ? 'Excellent' : 'Good'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Audits</p>
                          <p className="text-3xl font-bold text-foreground" data-testid="text-active-audits">
                            {complianceData?.activeAudits || 0}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex items-center mt-4">
                        <Clock className="w-4 h-4 text-orange-500 mr-1" />
                        <span className="text-sm font-medium text-orange-500">Active tenants</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Violations</p>
                          <p className="text-3xl font-bold text-foreground" data-testid="text-violations">
                            {complianceData?.violations || 0}
                          </p>
                        </div>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          (complianceData?.violations || 0) > 0 
                            ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                            : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                        }`}>
                          {(complianceData?.violations || 0) > 0 ? (
                            <AlertTriangle className="w-6 h-6" />
                          ) : (
                            <CheckCircle className="w-6 h-6" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center mt-4">
                        {(complianceData?.violations || 0) > 0 ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                            <span className="text-sm font-medium text-red-500">Needs attention</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                            <span className="text-sm font-medium text-green-500">All clear</span>
                          </>
                        )}
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
                      {complianceData?.regulatoryCompliance && (
                        <>
                          {Object.entries(complianceData.regulatoryCompliance).map(([key, value]: [string, any]) => {
                            const isCompliant = value.status === 'compliant';
                            const names: Record<string, string> = {
                              hipaa: 'HIPAA Compliance',
                              gdpr: 'UK GDPR Compliance',
                              soc2: 'SOC 2 Type II',
                              ccpa: 'CCPA Compliance'
                            };
                            const descriptions: Record<string, string> = {
                              hipaa: 'Health data protection standards',
                              gdpr: 'UK data protection regulation',
                              soc2: 'Security and availability controls',
                              ccpa: 'California consumer privacy act'
                            };
                            
                            return (
                              <div key={key} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    isCompliant
                                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                                      : 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
                                  }`}>
                                    {isCompliant ? '✓' : '!'}
                                  </div>
                                  <div>
                                    <div className="font-medium">{names[key]}</div>
                                    <div className="text-sm text-muted-foreground">{descriptions[key]}</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className={
                                  isCompliant
                                    ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700'
                                    : 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700'
                                }>
                                  {isCompliant ? 'Compliant' : 'In Progress'}
                                </Badge>
                              </div>
                            );
                          })}
                        </>
                      )}
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
                      {complianceData?.securityControls && (
                        <>
                          {Object.entries(complianceData.securityControls).map(([key, value]: [string, any]) => {
                            const isActive = value.status === 'active';
                            const isMissing = value.status === 'missing';
                            const names: Record<string, string> = {
                              encryption: 'Data Encryption',
                              accessControls: 'Access Controls',
                              mfa: 'Multi-Factor Authentication',
                              auditLogging: 'Audit Logging'
                            };
                            const descriptions: Record<string, string> = {
                              encryption: 'At-rest and in-transit encryption',
                              accessControls: 'Role-based access management',
                              mfa: 'Additional authentication layer',
                              auditLogging: 'Comprehensive activity tracking'
                            };
                            
                            return (
                              <div key={key} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                    isActive
                                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                                  }`}>
                                    {isActive ? '✓' : '✗'}
                                  </div>
                                  <div>
                                    <div className="font-medium">{names[key]}</div>
                                    <div className="text-sm text-muted-foreground">{descriptions[key]}</div>
                                  </div>
                                </div>
                                <Badge variant="outline" className={
                                  isActive
                                    ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700'
                                    : 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700'
                                }>
                                  {isActive ? 'Active' : 'Missing'}
                                </Badge>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity & Issues */}
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
                        {complianceData?.recentActivity && complianceData.recentActivity.length > 0 ? (
                          complianceData.recentActivity.map((activity: any, index: number) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{activity.type}</p>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <Eye className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">No recent activity</p>
                          </div>
                        )}
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
                        <Badge variant="destructive" data-testid="text-active-issues-count">
                          {complianceData?.activeIssues?.length || 0}
                        </Badge>
                      </CardTitle>
                      <CardDescription>Items requiring immediate attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {complianceData?.activeIssues && complianceData.activeIssues.length > 0 ? (
                          complianceData.activeIssues.map((issue: any, index: number) => {
                            const severityColors: Record<string, string> = {
                              critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400',
                              high: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400',
                              medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400',
                              low: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400'
                            };
                            const colorClass = severityColors[issue.severity] || severityColors.medium;
                            
                            return (
                              <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border ${colorClass}`}>
                                <AlertTriangle className="w-5 h-5 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-medium">{issue.type}</p>
                                  <p className="text-sm">{issue.description}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs capitalize">{issue.severity} Priority</p>
                                    <p className="text-xs">
                                      {formatDistanceToNow(new Date(issue.timestamp), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p className="text-sm">No issues detected</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
