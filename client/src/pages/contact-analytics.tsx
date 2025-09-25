import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, Phone, Target, BarChart3, 
  CheckCircle, Clock, AlertTriangle, PhoneCall
} from 'lucide-react';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

// Chart color schemes
const statusColors = {
  pending: '#f59e0b',
  confirmed: '#10b981', 
  cancelled: '#ef4444',
  rescheduled: '#6366f1'
};

const priorityColors = {
  normal: '#6b7280',
  high: '#f59e0b', 
  urgent: '#ef4444'
};

const methodColors = {
  voice: '#8b5cf6',
  email: '#06b6d4',
  sms: '#10b981'
};

interface ContactAnalytics {
  overview: {
    totalContacts: number;
    activeContacts: number;
    totalGroups: number;
    averageGroupSize: number;
  };
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
  priorityBreakdown: Array<{ priority: string; count: number; percentage: number }>;
  contactMethodAnalysis: Array<{ method: string; count: number; percentage: number }>;
  groupPerformance: Array<{
    groupName: string;
    memberCount: number;
    confirmedRate: number;
    color: string;
  }>;
  temporalTrends: Array<{
    date: string;
    contactsAdded: number;
    appointmentsConfirmed: number;
    callsSuccessful: number;
  }>;
  bookingSourceAnalysis: Array<{ source: string; count: number; percentage: number }>;
}

function MetricCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<any>;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
          {trend && (
            <span className={`ml-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusChart({ data }: { data: Array<{ status: string; count: number; percentage: number }> }) {
  const chartData = data.map(item => ({
    ...item,
    fill: statusColors[item.status as keyof typeof statusColors] || '#6b7280'
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart data-testid="chart-status-distribution">
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ status, percentage }) => `${status}: ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ data }: { 
  data: Array<{
    date: string;
    contactsAdded: number;
    appointmentsConfirmed: number;
    callsSuccessful: number;
  }> 
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} data-testid="chart-temporal-trends">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="contactsAdded" 
          stroke="#8884d8" 
          strokeWidth={2}
          name="Contacts Added"
        />
        <Line 
          type="monotone" 
          dataKey="appointmentsConfirmed" 
          stroke="#82ca9d" 
          strokeWidth={2}
          name="Appointments Confirmed"
        />
        <Line 
          type="monotone" 
          dataKey="callsSuccessful" 
          stroke="#ffc658" 
          strokeWidth={2}
          name="Successful Calls"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function GroupPerformanceChart({ data }: { 
  data: Array<{
    groupName: string;
    memberCount: number;
    confirmedRate: number;
    color: string;
  }> 
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} data-testid="chart-group-performance">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="groupName" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="memberCount" fill="#8884d8" name="Member Count" />
        <Bar dataKey="confirmedRate" fill="#82ca9d" name="Confirmed Rate %" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ContactAnalytics() {
  const { data: analytics, isLoading, error } = useQuery<ContactAnalytics>({
    queryKey: ['/api/contacts/analytics'],
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading analytics...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">Failed to load analytics data</p>
              </div>
            </div>
          )}

          {analytics && (
            <div className="space-y-6" data-testid="contact-analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="header-title">
            Contact Analytics
          </h1>
          <p className="text-muted-foreground" data-testid="header-description">
            Comprehensive insights into your contact management and appointment performance
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <BarChart3 className="h-4 w-4 mr-1" />
          Live Data
        </Badge>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Contacts"
          value={analytics.overview.totalContacts}
          description="All contacts in system"
          icon={Users}
        />
        <MetricCard
          title="Active Contacts"
          value={analytics.overview.activeContacts}
          description="Currently active contacts"
          icon={CheckCircle}
        />
        <MetricCard
          title="Contact Groups"
          value={analytics.overview.totalGroups}
          description="Organizational groups"
          icon={Target}
        />
        <MetricCard
          title="Avg Group Size"
          value={analytics.overview.averageGroupSize}
          description="Average contacts per group"
          icon={TrendingUp}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          <TabsTrigger value="sources" data-testid="tab-sources">Sources</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointment Status Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of appointment statuses across all contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusChart data={analytics.statusDistribution} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Preferred Contact Methods
                </CardTitle>
                <CardDescription>
                  How your contacts prefer to be reached
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.contactMethodAnalysis} data-testid="chart-contact-methods">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Priority Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Priority Level Analysis
              </CardTitle>
              <CardDescription>
                Distribution of contact priority levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {analytics.priorityBreakdown.map((item) => (
                  <div key={item.priority} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold" style={{ 
                      color: priorityColors[item.priority as keyof typeof priorityColors] 
                    }}>
                      {item.count}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {item.priority} Priority
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.percentage}% of total
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Group Performance Analysis
              </CardTitle>
              <CardDescription>
                Effectiveness and size metrics for each contact group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GroupPerformanceChart data={analytics.groupPerformance} />
            </CardContent>
          </Card>

          {/* Group Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
              <CardDescription>Detailed breakdown of group performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.groupPerformance.map((group, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      ></div>
                      <div>
                        <div className="font-medium">{group.groupName}</div>
                        <div className="text-sm text-muted-foreground">
                          {group.memberCount} members
                        </div>
                      </div>
                    </div>
                    <Badge variant={group.confirmedRate > 75 ? 'default' : 'secondary'}>
                      {group.confirmedRate}% confirmed
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                7-Day Activity Trends
              </CardTitle>
              <CardDescription>
                Contact additions, confirmations, and call success over the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={analytics.temporalTrends} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Booking Source Analysis
              </CardTitle>
              <CardDescription>
                Where your contacts are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart data-testid="chart-booking-sources">
                  <Pie
                    data={analytics.bookingSourceAnalysis}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ source, percentage }) => `${source}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.bookingSourceAnalysis.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index % 4]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Source Details */}
          <Card>
            <CardHeader>
              <CardTitle>Source Breakdown</CardTitle>
              <CardDescription>Detailed analysis of contact acquisition sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.bookingSourceAnalysis.map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium capitalize">{source.source}</div>
                      <div className="text-sm text-muted-foreground">
                        Booking source channel
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{source.count}</div>
                      <div className="text-sm text-muted-foreground">
                        {source.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
            </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}