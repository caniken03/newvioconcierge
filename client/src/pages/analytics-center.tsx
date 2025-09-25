import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Calendar, Phone, Target, 
  DollarSign, Activity, BarChart3, AlertTriangle, CheckCircle,
  Clock, Building, Zap, Database, Download, Filter
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

interface PlatformAnalytics {
  overview: {
    totalTenants: number;
    activeTenants: number;
    totalCalls: number;
    successRate: number;
    totalRevenue: number;
    monthlyGrowth: number;
  };
  tenantPerformance: Array<{
    tenantId: string;
    tenantName: string;
    callVolume: number;
    successRate: number;
    revenue: number;
    growth: number;
    status: 'active' | 'suspended' | 'trial';
  }>;
  platformTrends: Array<{
    date: string;
    totalCalls: number;
    successRate: number;
    activeUsers: number;
    revenue: number;
  }>;
  industryBreakdown: Array<{
    industry: string;
    tenantCount: number;
    avgSuccessRate: number;
    totalRevenue: number;
  }>;
}

interface TenantAnalytics {
  performance: any;
  calls: any;
  appointments: any;
  system: any;
}

export default function AnalyticsCenter() {
  const [timePeriod, setTimePeriod] = useState("30");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const { toast } = useToast();

  // Fetch platform-wide analytics
  const { data: platformData, isLoading: platformLoading } = useQuery<PlatformAnalytics>({
    queryKey: ['/api/admin/analytics/platform', timePeriod],
    refetchInterval: 30000,
  });

  // Fetch detailed analytics for insights
  const { data: performanceData } = useQuery({
    queryKey: ['/api/analytics/performance', timePeriod],
  });

  const { data: callsData } = useQuery({
    queryKey: ['/api/analytics/calls'],
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['/api/analytics/appointments', timePeriod],
  });

  // Mock data for demonstration (will be replaced with real API data)
  const mockPlatformData: PlatformAnalytics = {
    overview: {
      totalTenants: 24,
      activeTenants: 21,
      totalCalls: 15420,
      successRate: 92.3,
      totalRevenue: 127500,
      monthlyGrowth: 18.5
    },
    tenantPerformance: [
      { tenantId: '1', tenantName: 'ABC Medical Center', callVolume: 2450, successRate: 95.2, revenue: 18900, growth: 22.1, status: 'active' },
      { tenantId: '2', tenantName: 'Dental Practice Plus', callVolume: 1890, successRate: 88.7, revenue: 14200, growth: 15.3, status: 'active' },
      { tenantId: '3', tenantName: 'Beauty Salon Network', callVolume: 1200, successRate: 91.4, revenue: 9800, growth: -5.2, status: 'active' },
      { tenantId: '4', tenantName: 'Professional Services LLC', callVolume: 980, successRate: 87.2, revenue: 7500, growth: 8.9, status: 'trial' },
    ],
    platformTrends: [
      { date: '2024-09-01', totalCalls: 12200, successRate: 89.2, activeUsers: 1840, revenue: 98000 },
      { date: '2024-09-08', totalCalls: 13100, successRate: 90.1, activeUsers: 1920, revenue: 105000 },
      { date: '2024-09-15', totalCalls: 14300, successRate: 91.8, activeUsers: 2010, revenue: 115000 },
      { date: '2024-09-22', totalCalls: 15420, successRate: 92.3, activeUsers: 2140, revenue: 127500 },
    ],
    industryBreakdown: [
      { industry: 'Healthcare', tenantCount: 8, avgSuccessRate: 94.1, totalRevenue: 52000 },
      { industry: 'Beauty & Wellness', tenantCount: 6, avgSuccessRate: 89.7, totalRevenue: 38000 },
      { industry: 'Professional Services', tenantCount: 5, avgSuccessRate: 86.2, totalRevenue: 28000 },
      { industry: 'Food & Hospitality', tenantCount: 3, avgSuccessRate: 91.8, totalRevenue: 18000 },
      { industry: 'Other', tenantCount: 2, avgSuccessRate: 88.5, totalRevenue: 12000 },
    ]
  };

  const data = platformData || mockPlatformData;

  const handleExportReport = () => {
    try {
      // Generate CSV data for platform analytics
      const csvData = [
        ['Platform Analytics Report', `Generated: ${new Date().toLocaleDateString()}`],
        ['Time Period', `Last ${timePeriod} days`],
        [''],
        ['Overview Metrics'],
        ['Metric', 'Value', 'Change'],
        ['Total Tenants', data.overview.totalTenants, '+12.5%'],
        ['Active Tenants', data.overview.activeTenants, 'N/A'],
        ['Platform Success Rate', `${data.overview.successRate}%`, '+2.1%'],
        ['Total Calls', data.overview.totalCalls, '+18.7%'],
        ['Revenue', `$${data.overview.totalRevenue}`, `+${data.overview.monthlyGrowth}%`],
        [''],
        ['Tenant Performance'],
        ['Tenant Name', 'Call Volume', 'Success Rate', 'Revenue', 'Growth', 'Status'],
        ...data.tenantPerformance.map(tenant => [
          tenant.tenantName,
          tenant.callVolume,
          `${tenant.successRate}%`,
          `$${tenant.revenue}`,
          `${tenant.growth}%`,
          tenant.status
        ]),
        [''],
        ['Industry Breakdown'],
        ['Industry', 'Tenant Count', 'Avg Success Rate', 'Total Revenue'],
        ...data.industryBreakdown.map(industry => [
          industry.industry,
          industry.tenantCount,
          `${industry.avgSuccessRate}%`,
          `$${industry.totalRevenue}`
        ])
      ];

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `platform-analytics-${timePeriod}d-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported Successfully",
        description: `Platform analytics report for the last ${timePeriod} days has been downloaded.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    format = 'number',
    changeType = 'growth' 
  }: {
    title: string;
    value: number;
    change?: number;
    icon: any;
    format?: 'number' | 'percentage' | 'currency';
    changeType?: 'growth' | 'performance';
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'percentage': return `${val}%`;
        case 'currency': return `$${val.toLocaleString()}`;
        default: return val.toLocaleString();
      }
    };

    const isPositive = change ? change > 0 : false;
    const isNegative = change ? change < 0 : false;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold text-foreground">{formatValue(value)}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
          </div>
          {change !== undefined && (
            <div className="flex items-center mt-4">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : isNegative ? (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              ) : null}
              <span className={`text-sm font-medium ${
                isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">vs last period</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const variants = {
      active: 'default',
      trial: 'secondary',
      suspended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  if (platformLoading) {
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
    <div className="p-6 space-y-8" data-testid="analytics-center">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Center</h1>
          <p className="text-muted-foreground mt-1">
            Executive insights and platform performance analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport} data-testid="button-export-report">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Executive Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Tenants"
          value={data.overview.totalTenants}
          change={12.5}
          icon={Building}
        />
        <MetricCard
          title="Platform Success Rate"
          value={data.overview.successRate}
          change={2.1}
          icon={Target}
          format="percentage"
        />
        <MetricCard
          title="Total Calls (30d)"
          value={data.overview.totalCalls}
          change={18.7}
          icon={Phone}
        />
        <MetricCard
          title="Revenue (30d)"
          value={data.overview.totalRevenue}
          change={data.overview.monthlyGrowth}
          icon={DollarSign}
          format="currency"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Platform Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
          <TabsTrigger value="reports">Business Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Platform Performance Trends</span>
                </CardTitle>
                <CardDescription>Call success rates and volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.platformTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalCalls" fill="#3b82f6" name="Total Calls" />
                    <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Industry Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Industry Distribution</span>
                </CardTitle>
                <CardDescription>Tenant breakdown by industry vertical</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.industryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ industry, tenantCount }) => `${industry} (${tenantCount})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="tenantCount"
                    >
                      {data.industryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* System Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Platform Health Status</span>
              </CardTitle>
              <CardDescription>Real-time system performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Database</p>
                    <p className="text-sm text-green-600 dark:text-green-400">99.9% uptime</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-300">API Response</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">125ms avg</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Zap className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-300">Call System</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Operational</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Performance Analysis</CardTitle>
              <CardDescription>Individual tenant metrics and comparisons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.tenantPerformance.map((tenant) => (
                  <div key={tenant.tenantId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{tenant.tenantName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <StatusBadge status={tenant.status} />
                          <span className="text-sm text-muted-foreground">
                            {tenant.callVolume.toLocaleString()} calls
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-right">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="font-medium">{tenant.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="font-medium">${tenant.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Growth</p>
                        <p className={`font-medium ${tenant.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tenant.growth > 0 ? '+' : ''}{tenant.growth}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Growth Trend</CardTitle>
                <CardDescription>Platform revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.platformTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Users Growth</CardTitle>
                <CardDescription>Platform user engagement trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.platformTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="activeUsers" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Industry Performance Comparison</CardTitle>
                <CardDescription>Success rates by industry vertical</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.industryBreakdown} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="industry" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="avgSuccessRate" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Industry</CardTitle>
                <CardDescription>Revenue distribution across verticals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.industryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="industry" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalRevenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>Key insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Growth Opportunity</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Healthcare vertical shows highest success rates (94.1%) and strong revenue potential. 
                  Consider targeted marketing to medical practices.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Performance Alert</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Professional Services segment shows lower than average success rates (86.2%). 
                  Review call scripts and timing strategies for this vertical.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">System Health</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Platform performance remains excellent with 99.9% uptime and 125ms average API response time.
                  Infrastructure is scaling well with growth.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}