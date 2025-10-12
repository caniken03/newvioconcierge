import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Globe,
  Monitor
} from "lucide-react";
import { format } from "date-fns";

interface AuditTrailEntry {
  id: string;
  correlationId: string;
  tenantId: string;
  userId: string | null;
  userName?: string;
  userEmail?: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  outcome: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  sensitivity: string;
  timestamp: string;
}

interface AuditVerification {
  isValid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  brokenChainAt: number | null;
  lastVerifiedHash: string | null;
  verificationDate?: string;
}

export default function AuditTrail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    action: "",
    outcome: "",
    userId: ""
  });

  // Fetch audit trail data
  const { data: auditData, isLoading: auditLoading, refetch } = useQuery({
    queryKey: ['/api/compliance/audit-trail', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.action && { action: filters.action }),
        ...(filters.outcome && { outcome: filters.outcome }),
        ...(filters.userId && { userId: filters.userId })
      });
      
      const response = await fetch(`/api/compliance/audit-trail?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch audit trail');
      return response.json();
    },
    enabled: !!user && (user.role === 'client_admin' || user.role === 'super_admin')
  });

  // Fetch audit integrity verification
  const { data: verification, isLoading: verificationLoading, isError: verificationError } = useQuery<AuditVerification>({
    queryKey: ['/api/compliance/audit-verification'],
    queryFn: async () => {
      const response = await fetch('/api/compliance/audit-verification', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to verify audit trail');
      const data = await response.json();
      return data.verification;
    },
    enabled: !!user && (user.role === 'client_admin' || user.role === 'super_admin')
  });

  // Fetch team members for user filter
  const { data: teamMembers = [] } = useQuery<Array<{ id: string; fullName: string; email: string }>>({
    queryKey: ['/api/team/users'],
    enabled: !!user && user.role === 'client_admin'
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.action && { action: filters.action }),
        ...(filters.outcome && { outcome: filters.outcome }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await fetch(`/api/compliance/audit-trail/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Success", description: "Audit trail exported successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export audit trail", variant: "destructive" });
    }
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('LOGIN_SUCCESS') || action.includes('SUCCESS')) return 'default';
    if (action.includes('LOGIN_FAILED') || action.includes('FAILED')) return 'destructive';
    if (action.includes('EXPORT') || action.includes('ACCESS')) return 'secondary';
    return 'outline';
  };

  const getOutcomeBadgeVariant = (outcome: string): "default" | "secondary" | "destructive" | "outline" => {
    if (outcome === 'SUCCESS') return 'default';
    if (outcome === 'FAILURE' || outcome === 'DENIED') return 'destructive';
    if (outcome === 'PARTIAL') return 'secondary';
    return 'outline';
  };

  const getSensitivityColor = (sensitivity: string) => {
    switch (sensitivity) {
      case 'HIGH': return 'text-red-600 dark:text-red-400';
      case 'MEDIUM': return 'text-orange-600 dark:text-orange-400';
      case 'LOW': return 'text-green-600 dark:text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  if (!user || (user.role !== 'client_admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the audit trail.</p>
        </div>
      </div>
    );
  }

  const auditTrail: AuditTrailEntry[] = auditData?.auditTrail || [];
  const total = auditData?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="audit-trail-page">
                  Audit Trail
                </h1>
                <p className="text-muted-foreground mt-1">
                  Complete activity log of all user actions, login attempts, and security events
                </p>
              </div>
              <Button onClick={handleExport} data-testid="button-export-audit-trail">
                <Download className="w-4 h-4 mr-2" />
                Export Audit Log
              </Button>
            </div>

            {/* Audit Integrity Verification */}
            <Card data-testid="audit-integrity-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Audit Trail Integrity Verification
                </CardTitle>
                <CardDescription>
                  Tamper-proof, hash-chained audit logs retained for 7 years (UK GDPR Article 30)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationLoading ? (
                  <div className="text-sm text-muted-foreground">Verifying integrity...</div>
                ) : verificationError || !verification ? (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="font-semibold text-orange-900 dark:text-orange-100">Unable to Verify Audit Trail</p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Could not connect to verification service. Please try again or contact support.
                      </p>
                    </div>
                  </div>
                ) : verification.isValid ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 dark:text-green-100">Audit Trail Verified</p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {verification.verifiedEntries} of {verification.totalEntries} entries verified. No tampering detected.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {verification.verificationDate && (
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">Last Verified:</span>
                          <span className="text-muted-foreground">{format(new Date(verification.verificationDate), 'PPpp')}</span>
                        </div>
                      )}
                      {verification.lastVerifiedHash && (
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">Last Hash:</span>
                          <span className="font-mono text-xs text-muted-foreground truncate" title={verification.lastVerifiedHash}>
                            {verification.lastVerifiedHash.substring(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100">Integrity Issue Detected</p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Chain broken at entry {verification.brokenChainAt}. Verified {verification.verifiedEntries}/{verification.totalEntries} entries. Contact support immediately.
                      </p>
                      {verification.lastVerifiedHash && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
                          Last valid hash: {verification.lastVerifiedHash.substring(0, 24)}...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <Card data-testid="audit-filters-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      data-testid="input-filter-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      data-testid="input-filter-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action-filter">Action Type</Label>
                    <Select value={filters.action || "all"} onValueChange={(value) => setFilters({ ...filters, action: value === "all" ? "" : value })}>
                      <SelectTrigger id="action-filter" data-testid="select-filter-action">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        <SelectItem value="USER_LOGIN">Login</SelectItem>
                        <SelectItem value="USER_LOGIN_FAILURE">Failed Login</SelectItem>
                        <SelectItem value="USER_LOGOUT">Logout</SelectItem>
                        <SelectItem value="DATA_EXPORT">Data Export</SelectItem>
                        <SelectItem value="DATA_ACCESS">Data Access</SelectItem>
                        <SelectItem value="TENANT_IMPERSONATION">Tenant Access</SelectItem>
                        <SelectItem value="TENANT_CREATION">Tenant Created</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outcome-filter">Outcome</Label>
                    <Select value={filters.outcome || "all"} onValueChange={(value) => setFilters({ ...filters, outcome: value === "all" ? "" : value })}>
                      <SelectTrigger id="outcome-filter" data-testid="select-filter-outcome">
                        <SelectValue placeholder="All outcomes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All outcomes</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="FAILURE">Failure</SelectItem>
                        <SelectItem value="DENIED">Denied</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-filter">User</Label>
                    <Select value={filters.userId || "all"} onValueChange={(value) => setFilters({ ...filters, userId: value === "all" ? "" : value })}>
                      <SelectTrigger id="user-filter" data-testid="select-filter-user">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {teamMembers.map((member: any) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.fullName} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => refetch()} data-testid="button-apply-filters">
                    <Search className="w-4 h-4 mr-2" />
                    Apply Filters
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilters({ startDate: "", endDate: "", action: "", outcome: "", userId: "" });
                      setPage(1);
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Audit Trail Table */}
            <Card data-testid="audit-trail-table-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Log ({total} entries)
                </CardTitle>
                <CardDescription>
                  Detailed record of all login attempts, user actions, and security events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground">Loading audit trail...</div>
                  </div>
                ) : auditTrail.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No audit entries found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditTrail.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                        data-testid={`audit-entry-${entry.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={getActionBadgeVariant(entry.action)} data-testid={`badge-action-${entry.id}`}>
                              {entry.action.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant={getOutcomeBadgeVariant(entry.outcome)} data-testid={`badge-outcome-${entry.id}`}>
                              {entry.outcome}
                            </Badge>
                            <span className={`text-xs font-medium ${getSensitivityColor(entry.sensitivity)}`}>
                              {entry.sensitivity} Sensitivity
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground" data-testid={`timestamp-${entry.id}`}>
                            {format(new Date(entry.timestamp), 'PPpp')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">User:</span>
                            <span data-testid={`user-${entry.id}`}>
                              {entry.userName || entry.userEmail || 'System'}
                            </span>
                          </div>
                          
                          {entry.resource && (
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">Resource:</span>
                              <span data-testid={`resource-${entry.id}`}>{entry.resource}</span>
                            </div>
                          )}

                          {entry.ipAddress && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">IP Address:</span>
                              <span className="font-mono text-xs" data-testid={`ip-${entry.id}`}>{entry.ipAddress}</span>
                            </div>
                          )}

                          {entry.userAgent && (
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">User Agent:</span>
                              <span className="text-xs truncate" data-testid={`user-agent-${entry.id}`}>
                                {entry.userAgent.substring(0, 50)}...
                              </span>
                            </div>
                          )}
                        </div>

                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-3 p-3 bg-muted/50 rounded text-xs font-mono">
                            <div className="font-semibold mb-1">Details:</div>
                            <pre className="whitespace-pre-wrap" data-testid={`details-${entry.id}`}>
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({total} total entries)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          data-testid="button-previous-page"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page === totalPages}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Information Footer */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Compliance & Retention</p>
                    <p className="text-sm text-muted-foreground">
                      All audit logs are retained for 7 years in compliance with UK GDPR Article 30. 
                      The audit trail uses hash-chaining to prevent tampering and ensure data integrity. 
                      Login attempts, data exports, and all sensitive actions are automatically logged for security and compliance purposes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
