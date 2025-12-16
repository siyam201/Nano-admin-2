import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserPlus, Activity, Server, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuthFetch } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import type { Activity as ActivityType, User } from "@shared/schema";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  pendingApprovals: number;
}

interface ActivityWithUser extends ActivityType {
  user?: User | null;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: ActivityWithUser }) {
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getActionIcon = (action: string) => {
    if (action.includes("login")) return <UserCheck className="h-3 w-3" />;
    if (action.includes("register")) return <UserPlus className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <div className="flex items-start gap-3 py-3" data-testid={`activity-item-${activity.id}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {getInitials(activity.user?.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getActionIcon(activity.action)}
          <span className="text-sm font-medium truncate">
            {activity.user?.name || "System"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{activity.action}</p>
        {activity.details && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {activity.details}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const authFetch = useAuthFetch();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await authFetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityWithUser[]>({
    queryKey: ["/api/activities/recent"],
    queryFn: async () => {
      const res = await authFetch("/api/activities/recent");
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            isLoading={statsLoading}
          />
          <StatCard
            title="Active Users"
            value={stats?.activeUsers ?? 0}
            icon={UserCheck}
            isLoading={statsLoading}
          />
          <StatCard
            title="New Today"
            value={stats?.newUsersToday ?? 0}
            icon={UserPlus}
            isLoading={statsLoading}
          />
          <StatCard
            title="Pending Approval"
            value={stats?.pendingApprovals ?? 0}
            icon={Activity}
            isLoading={statsLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="divide-y">
                  {activities.slice(0, 8).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
              <CardDescription>Service health overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">API Server</span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email Service</span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
