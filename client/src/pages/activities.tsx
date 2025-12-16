import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  Key,
  Settings,
  Shield,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthFetch } from "@/lib/auth";
import { formatDistanceToNow, format } from "date-fns";
import type { Activity as ActivityType, User } from "@shared/schema";

interface ActivityWithUser extends ActivityType {
  user?: User | null;
}

interface ActivitiesResponse {
  activities: ActivityWithUser[];
  total: number;
  page: number;
  limit: number;
}

export default function ActivitiesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const authFetch = useAuthFetch();

  const { data, isLoading } = useQuery<ActivitiesResponse>({
    queryKey: ["/api/activities", page, search, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(actionFilter !== "all" && { action: actionFilter }),
      });
      const res = await authFetch(`/api/activities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

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
    if (action.includes("login")) return <LogIn className="h-4 w-4" />;
    if (action.includes("logout")) return <LogOut className="h-4 w-4" />;
    if (action.includes("register")) return <UserPlus className="h-4 w-4" />;
    if (action.includes("approved") || action.includes("activated")) return <UserCheck className="h-4 w-4" />;
    if (action.includes("api") || action.includes("key")) return <Key className="h-4 w-4" />;
    if (action.includes("settings") || action.includes("updated")) return <Settings className="h-4 w-4" />;
    if (action.includes("admin") || action.includes("role")) return <Shield className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("blocked")) return "text-red-500";
    if (action.includes("created") || action.includes("approved") || action.includes("activated")) return "text-green-500";
    if (action.includes("updated") || action.includes("changed")) return "text-blue-500";
    return "text-muted-foreground";
  };

  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <DashboardLayout title="Activity Log">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              data-testid="input-search-activities"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="register">Registration</SelectItem>
              <SelectItem value="user">User Management</SelectItem>
              <SelectItem value="api">API Keys</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : data?.activities && data.activities.length > 0 ? (
              <div className="divide-y">
                {data.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 hover-elevate"
                    data-testid={`activity-row-${activity.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center ${getActionColor(activity.action)}`}>
                        {getActionIcon(activity.action)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-activity-user-${activity.id}`}>
                          {activity.user?.name || "System"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {activity.action}
                        </span>
                      </div>
                      {activity.details && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {activity.details}
                        </p>
                      )}
                      {activity.ipAddress && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          IP: {activity.ipAddress}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(activity.createdAt), "MMM d, HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No activities found</p>
                <p className="text-sm">Activity logs will appear here once actions are performed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data?.total || 0)} of {data?.total || 0} activities
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
