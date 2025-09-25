import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, Phone, Target, BarChart3, 
  CheckCircle, Clock, AlertTriangle, PhoneCall, Activity,
  DollarSign, Zap, Database, Shield, RefreshCw, Gauge
} from 'lucide-react';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useState } from 'react';

// Performance Overview Data
interface PerformanceOverview {
  callSuccessRate: number;
  appointmentConfirmationRate: number;
  noShowReduction: number;
  dailyCallVolume: number;
  revenueProtection: number;
  previousPeriodComparison: {
    callSuccessRate: number;
    appointmentConfirmationRate: number;
    dailyCallVolume: number;
  };
}

// Call Activity Data
interface CallActivity {
  activeCalls: number;
  todaysSummary: {
    callsAttemptedToday: number;
    callsCompletedToday: number;
    appointmentsConfirmedToday: number;
    pendingCalls: number;
  };
  outcomeBreakdown: Array<{
    outcome: string;
    count: number;
    percentage: number;
  }>;
  recentCallActivity: Array<{
    id: string;
    contactName: string;
    status: string;
    outcome: string;
    timestamp: Date;
    duration?: number;
  }>;
}

// Appointment Insights Data
interface AppointmentInsights {
  confirmationTrends: Array<{
    date: string;
    confirmationRate: number;
    totalAppointments: number;
    confirmed: number;
  }>;
  noShowPatterns: Array<{
    timeSlot: string;
    noShowRate: number;
    totalAppointments: number;
  }>;
  appointmentTypeAnalysis: Array<{
    type: string;
    count: number;
    confirmationRate: number;
    averageDuration: number;
  }>;
  leadTimeAnalysis: Array<{
    leadTimeDays: number;
    confirmationRate: number;
    count: number;
  }>;
}

// System Health Data
interface SystemHealth {
  callSystemHealth: {
    averageCallDuration: number;
    errorRate: number;
    responseTime: number;
    uptime: number;
  };
  databasePerformance: {
    queryResponseTime: number;
    connectionCount: number;
    dataGrowthRate: number;
  };
  apiPerformance: {
    successRate: number;
    averageResponseTime: number;
    errorsByType: Array<{ type: string; count: number }>;
  };
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  unit = "",
  comparison 
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<any>;
  trend?: { value: number; isPositive: boolean };
  unit?: string;
  comparison?: { previous: number; isIncrease: boolean; timePeriod: string };
}) {
  return (
    <Card data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}{unit}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
          {trend && (
            <span className={`ml-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
          {comparison && (
            <span className={`ml-2 ${comparison.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
              {comparison.isIncrease ? '↗' : '↘'} {comparison.previous}% vs {comparison.timePeriod}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function PerformanceOverviewSection() {
  const [timePeriod, setTimePeriod] = useState(30);
  
  const { data: performance, isLoading, error } = useQuery<PerformanceOverview>({
    queryKey: [`/api/analytics/performance?timePeriod=${timePeriod}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Failed to load performance data</p>
        </div>
      </div>
    );
  }

  if (!performance) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Overview</h2>
        <div className="flex gap-2">
          <Button 
            variant={timePeriod === 7 ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimePeriod(7)}
            data-testid="button-period-7"
          >
            7 Days
          </Button>
          <Button 
            variant={timePeriod === 30 ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimePeriod(30)}
            data-testid="button-period-30"
          >
            30 Days
          </Button>
          <Button 
            variant={timePeriod === 90 ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimePeriod(90)}
            data-testid="button-period-90"
          >
            90 Days
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Call Success Rate"
          value={performance.callSuccessRate}
          unit="%"
          description="Calls answered successfully"
          icon={PhoneCall}
          comparison={{
            previous: performance.previousPeriodComparison.callSuccessRate,
            isIncrease: performance.callSuccessRate > performance.previousPeriodComparison.callSuccessRate,
            timePeriod: "prev period"
          }}
        />
        <MetricCard
          title="Appointment Confirmation"
          value={performance.appointmentConfirmationRate}
          unit="%"
          description="Appointments confirmed"
          icon={CheckCircle}
          comparison={{
            previous: performance.previousPeriodComparison.appointmentConfirmationRate,
            isIncrease: performance.appointmentConfirmationRate > performance.previousPeriodComparison.appointmentConfirmationRate,
            timePeriod: "prev period"
          }}
        />
        <MetricCard
          title="No-Show Reduction"
          value={performance.noShowReduction}
          unit="%"
          description="Improvement over baseline"
          icon={TrendingUp}
        />
        <MetricCard
          title="Daily Call Volume"
          value={performance.dailyCallVolume}
          description="Calls processed today"
          icon={Activity}
          comparison={{
            previous: performance.previousPeriodComparison.dailyCallVolume,
            isIncrease: performance.dailyCallVolume > performance.previousPeriodComparison.dailyCallVolume,
            timePeriod: "daily avg"
          }}
        />
        <MetricCard
          title="Revenue Protection"
          value={`$${performance.revenueProtection.toLocaleString()}`}
          description="Protected through confirmations"
          icon={DollarSign}
        />
      </div>
    </div>
  );
}

function CallActivitySection() {
  const { data: calls, isLoading, error } = useQuery<CallActivity>({
    queryKey: ['/api/analytics/calls'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Failed to load call activity data</p>
        </div>
      </div>
    );
  }

  if (!calls) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Call Activity</h2>

      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Calls"
          value={calls.activeCalls}
          description="Currently in progress"
          icon={PhoneCall}
        />
        <MetricCard
          title="Calls Attempted Today"
          value={calls.todaysSummary.callsAttemptedToday}
          description="Total call attempts"
          icon={Phone}
        />
        <MetricCard
          title="Calls Completed Today"
          value={calls.todaysSummary.callsCompletedToday}
          description="Successfully completed"
          icon={CheckCircle}
        />
        <MetricCard
          title="Pending Calls"
          value={calls.todaysSummary.pendingCalls}
          description="Scheduled within 24h"
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Outcome Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Call Outcome Breakdown</CardTitle>
            <CardDescription>Last 30 days call results</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart data-testid="chart-call-outcomes">
                <Pie
                  data={calls.outcomeBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ outcome, percentage }) => `${outcome}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {calls.outcomeBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'][index % 5]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Call Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Call Activity</CardTitle>
            <CardDescription>Latest 20 call attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {calls.recentCallActivity.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{call.contactName}</div>
                    <div className="text-xs text-muted-foreground">
                      {typeof call.timestamp === 'string' 
                        ? new Date(call.timestamp).toLocaleTimeString()
                        : call.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={call.outcome === 'confirmed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {call.outcome}
                    </Badge>
                    {call.duration && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(call.duration / 60)}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AppointmentInsightsSection() {
  const [timePeriod, setTimePeriod] = useState(30);
  
  const { data: insights, isLoading, error } = useQuery<AppointmentInsights>({
    queryKey: [`/api/analytics/appointments?timePeriod=${timePeriod}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Failed to load appointment insights</p>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appointment Insights</h2>
        <div className="flex gap-2">
          <Button 
            variant={timePeriod === 7 ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimePeriod(7)}
          >
            7 Days
          </Button>
          <Button 
            variant={timePeriod === 30 ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimePeriod(30)}
          >
            30 Days
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Confirmation Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Confirmation Trends</CardTitle>
            <CardDescription>Daily confirmation rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={insights.confirmationTrends} data-testid="chart-confirmation-trends">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="confirmationRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Confirmation Rate %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* No-Show Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>No-Show Patterns by Time</CardTitle>
            <CardDescription>No-show rates by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.noShowPatterns} data-testid="chart-noshow-patterns">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeSlot" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="noShowRate" fill="#ef4444" name="No-Show Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointment Type Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Type Performance</CardTitle>
            <CardDescription>Confirmation rates by appointment type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.appointmentTypeAnalysis} data-testid="chart-appointment-types">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Count" />
                <Bar dataKey="confirmationRate" fill="#82ca9d" name="Confirmation Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Time Impact</CardTitle>
            <CardDescription>Confirmation rates by advance booking days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={insights.leadTimeAnalysis} data-testid="chart-lead-time">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="leadTimeDays" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="confirmationRate" 
                  stroke="#6366f1" 
                  fill="#6366f1" 
                  fillOpacity={0.3}
                  name="Confirmation Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SystemHealthSection() {
  const { data: health, isLoading, error } = useQuery<SystemHealth>({
    queryKey: ['/api/analytics/system'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Failed to load system health data</p>
        </div>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Health</h2>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Call System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Call System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm">Avg Call Duration</span>
                <span className="font-medium">{health.callSystemHealth.averageCallDuration}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Error Rate</span>
                <span className={`font-medium ${health.callSystemHealth.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {health.callSystemHealth.errorRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Response Time</span>
                <span className="font-medium">{health.callSystemHealth.responseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Uptime</span>
                <span className={`font-medium ${health.callSystemHealth.uptime > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {health.callSystemHealth.uptime}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm">Query Response</span>
                <span className="font-medium">{health.databasePerformance.queryResponseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Connections</span>
                <span className="font-medium">{health.databasePerformance.connectionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Data Growth Rate</span>
                <span className={`font-medium ${health.databasePerformance.dataGrowthRate > 50 ? 'text-red-600' : 'text-green-600'}`}>
                  {health.databasePerformance.dataGrowthRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              API Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm">Success Rate</span>
                <span className={`font-medium ${health.apiPerformance.successRate > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {health.apiPerformance.successRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Avg Response Time</span>
                <span className="font-medium">{health.apiPerformance.averageResponseTime}ms</span>
              </div>
            </div>
            
            {health.apiPerformance.errorsByType.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent Errors:</div>
                {health.apiPerformance.errorsByType.map((error, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span>{error.type}</span>
                    <span className="text-red-600">{error.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ContactAnalytics() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="space-y-8" data-testid="comprehensive-analytics-dashboard">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="header-title">
                  Analytics Dashboard
                </h1>
                <p className="text-muted-foreground" data-testid="header-description">
                  Comprehensive insights into your voice appointment management platform
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Live Data
                </Badge>
                <Button variant="outline" size="sm" data-testid="button-refresh">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Analytics Sections */}
            <Tabs defaultValue="performance" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
                <TabsTrigger value="calls" data-testid="tab-calls">Call Activity</TabsTrigger>
                <TabsTrigger value="appointments" data-testid="tab-appointments">Appointments</TabsTrigger>
                <TabsTrigger value="system" data-testid="tab-system">System Health</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-6">
                <PerformanceOverviewSection />
              </TabsContent>

              <TabsContent value="calls" className="space-y-6">
                <CallActivitySection />
              </TabsContent>

              <TabsContent value="appointments" className="space-y-6">
                <AppointmentInsightsSection />
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                <SystemHealthSection />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}