import { Book, Key, Shield, Users, Activity, BarChart3, Copy, Check, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EndpointProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth?: boolean;
  adminOnly?: boolean;
  requestBody?: { field: string; type: string; required?: boolean; description: string }[];
  responseExample?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      data-testid="button-copy-code"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
        <code className="text-foreground">{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-600 dark:text-green-400",
    POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    PATCH: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <Badge variant="outline" className={`${colors[method]} font-mono text-xs`}>
      {method}
    </Badge>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointProps }) {
  return (
    <Card className="mb-4" data-testid={`endpoint-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/\//g, "-")}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <MethodBadge method={endpoint.method} />
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{endpoint.path}</code>
          {endpoint.auth && (
            <Badge variant="secondary" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Auth Required
            </Badge>
          )}
          {endpoint.adminOnly && (
            <Badge variant="destructive" className="text-xs">
              Admin Only
            </Badge>
          )}
        </div>
        <CardDescription className="mt-2">{endpoint.description}</CardDescription>
      </CardHeader>
      {(endpoint.requestBody || endpoint.responseExample) && (
        <CardContent className="space-y-4">
          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-medium mb-2">Request Body:</h4>
              <div className="bg-muted rounded-md p-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2">Field</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Required</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.requestBody.map((field) => (
                      <tr key={field.field} className="border-t border-border">
                        <td className="py-2 font-mono text-xs">{field.field}</td>
                        <td className="py-2 text-muted-foreground">{field.type}</td>
                        <td className="py-2">
                          {field.required ? (
                            <Badge variant="default" className="text-xs">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">No</Badge>
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {endpoint.responseExample && (
            <div>
              <h4 className="text-sm font-medium mb-2">Response Example:</h4>
              <CodeBlock code={endpoint.responseExample} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

const authEndpoints: EndpointProps[] = [
  {
    method: "POST",
    path: "/api/auth/register",
    description: "Register a new user account. The first user becomes admin automatically.",
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
      { field: "password", type: "string", required: true, description: "Password (min 8 chars)" },
      { field: "name", type: "string", required: true, description: "Full name" },
    ],
    responseExample: `{
  "message": "Verification code sent to your email",
  "isFirstUser": false
}`,
  },
  {
    method: "POST",
    path: "/api/auth/verify",
    description: "Verify email with the code sent during registration.",
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
      { field: "code", type: "string", required: true, description: "6-digit verification code" },
    ],
    responseExample: `{
  "message": "Email verified. Waiting for admin approval."
}`,
  },
  {
    method: "POST",
    path: "/api/auth/resend-code",
    description: "Resend verification code to email.",
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
    ],
    responseExample: `{
  "message": "Verification code sent"
}`,
  },
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Login with email and password. Returns access token and sets refresh token cookie.",
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
      { field: "password", type: "string", required: true, description: "User password" },
    ],
    responseExample: `{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "status": "active"
  }
}`,
  },
  {
    method: "POST",
    path: "/api/auth/refresh",
    description: "Refresh access token using HTTP-only refresh token cookie.",
    responseExample: `{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": { ... }
}`,
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    description: "Logout and invalidate refresh token.",
    responseExample: `{
  "message": "Logged out successfully"
}`,
  },
  {
    method: "PATCH",
    path: "/api/auth/profile",
    description: "Update current user's profile.",
    auth: true,
    requestBody: [
      { field: "name", type: "string", required: false, description: "New name" },
      { field: "email", type: "string", required: false, description: "New email" },
    ],
    responseExample: `{
  "user": {
    "id": "uuid-here",
    "email": "newemail@example.com",
    "name": "New Name",
    ...
  }
}`,
  },
  {
    method: "POST",
    path: "/api/auth/change-password",
    description: "Change password (invalidates all refresh tokens).",
    auth: true,
    requestBody: [
      { field: "currentPassword", type: "string", required: true, description: "Current password" },
      { field: "newPassword", type: "string", required: true, description: "New password (min 8 chars)" },
    ],
    responseExample: `{
  "message": "Password changed successfully"
}`,
  },
];

const userEndpoints: EndpointProps[] = [
  {
    method: "GET",
    path: "/api/users",
    description: "Get list of users with pagination and filtering.",
    auth: true,
    responseExample: `{
  "users": [
    {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "status": "active",
      "lastLoginAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}`,
  },
  {
    method: "PATCH",
    path: "/api/users/:id",
    description: "Update a user's details (name, role, status).",
    auth: true,
    adminOnly: true,
    requestBody: [
      { field: "name", type: "string", required: false, description: "User name" },
      { field: "role", type: "string", required: false, description: "user or admin" },
      { field: "status", type: "string", required: false, description: "active, pending, or blocked" },
    ],
    responseExample: `{
  "id": "uuid-here",
  "email": "user@example.com",
  "name": "Updated Name",
  "role": "admin",
  "status": "active"
}`,
  },
  {
    method: "DELETE",
    path: "/api/users/:id",
    description: "Delete a user account.",
    auth: true,
    adminOnly: true,
    responseExample: `{
  "message": "User deleted successfully"
}`,
  },
];

const dashboardEndpoints: EndpointProps[] = [
  {
    method: "GET",
    path: "/api/dashboard/stats",
    description: "Get dashboard statistics.",
    auth: true,
    responseExample: `{
  "totalUsers": 150,
  "activeUsers": 120,
  "newUsersToday": 5,
  "pendingApprovals": 3
}`,
  },
];

const activityEndpoints: EndpointProps[] = [
  {
    method: "GET",
    path: "/api/activities",
    description: "Get all activities with pagination and filtering.",
    auth: true,
    responseExample: `{
  "activities": [
    {
      "id": "uuid-here",
      "userId": "user-uuid",
      "action": "User logged in",
      "details": null,
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-01-15T10:30:00Z",
      "user": { "name": "John Doe", ... }
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 10
}`,
  },
  {
    method: "GET",
    path: "/api/activities/recent",
    description: "Get recent activities (last 10).",
    auth: true,
    responseExample: `{
  "activities": [ ... ]
}`,
  },
];

const apiKeyEndpoints: EndpointProps[] = [
  {
    method: "GET",
    path: "/api/api-keys",
    description: "Get all API keys for current user.",
    auth: true,
    responseExample: `[
  {
    "id": "uuid-here",
    "name": "Production API Key",
    "key": "ak_xxxx...xxxx",
    "lastUsedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]`,
  },
  {
    method: "POST",
    path: "/api/api-keys",
    description: "Create a new API key.",
    auth: true,
    requestBody: [
      { field: "name", type: "string", required: true, description: "Key name for identification" },
    ],
    responseExample: `{
  "id": "uuid-here",
  "name": "My New Key",
  "key": "ak_full_key_shown_only_once",
  "createdAt": "2024-01-15T10:30:00Z"
}`,
  },
  {
    method: "PATCH",
    path: "/api/api-keys/:id",
    description: "Update an API key (e.g., rename).",
    auth: true,
    requestBody: [
      { field: "name", type: "string", required: false, description: "New key name" },
    ],
    responseExample: `{
  "id": "uuid-here",
  "name": "Updated Key Name",
  ...
}`,
  },
  {
    method: "DELETE",
    path: "/api/api-keys/:id",
    description: "Delete an API key.",
    auth: true,
    responseExample: `{
  "message": "API key deleted"
}`,
  },
];

const externalEndpoints: EndpointProps[] = [
  {
    method: "POST",
    path: "/api/external/register",
    description: "Register a new user via API. User will be auto-approved after email verification (no admin approval needed). Email includes API key name as app name.",
    auth: true,
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
      { field: "password", type: "string", required: true, description: "Password (min 6 chars)" },
      { field: "name", type: "string", required: true, description: "Full name" },
    ],
    responseExample: `{
  "message": "Verification code sent to your email",
  "appName": "My App Name"
}`,
  },
  {
    method: "POST",
    path: "/api/external/verify",
    description: "Verify email and auto-approve user. Returns tokens for immediate login.",
    auth: true,
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
      { field: "code", type: "string", required: true, description: "6-digit verification code" },
    ],
    responseExample: `{
  "message": "Email verified and account approved",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active"
  }
}`,
  },
  {
    method: "POST",
    path: "/api/external/login",
    description: "Login user via API. Returns access and refresh tokens.",
    auth: true,
    requestBody: [
      { field: "email", type: "string", required: true, description: "User email address" },
      { field: "password", type: "string", required: true, description: "User password" },
    ],
    responseExample: `{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active"
  }
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">API Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Complete API reference for integrating with this application.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              How to authenticate and use the API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Base URL</h3>
              <CodeBlock code={`${window.location.origin}/api`} />
            </div>
            <div>
              <h3 className="font-medium mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Most endpoints require authentication. Include the access token in the Authorization header:
              </p>
              <CodeBlock code={`Authorization: Bearer <access_token>`} />
            </div>
            <div>
              <h3 className="font-medium mb-2">Example Request</h3>
              <CodeBlock
                code={`curl -X GET "${window.location.origin}/api/users" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \\
  -H "Content-Type: application/json"`}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="auth" className="flex items-center gap-1" data-testid="tab-auth">
              <Shield className="h-4 w-4" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="activities" className="flex items-center gap-1" data-testid="tab-activities">
              <Activity className="h-4 w-4" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="apikeys" className="flex items-center gap-1" data-testid="tab-apikeys">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-1" data-testid="tab-external">
              <Globe className="h-4 w-4" />
              External API
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            <TabsContent value="auth" className="mt-0">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">Authentication Endpoints</h2>
                {authEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">User Management Endpoints</h2>
                {userEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">Dashboard Endpoints</h2>
                {dashboardEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activities" className="mt-0">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">Activity Endpoints</h2>
                {activityEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="apikeys" className="mt-0">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold mb-4">API Key Endpoints</h2>
                {apiKeyEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="external" className="mt-0">
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">External API Authentication</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    External API endpoints use API Key authentication. Include your API key in the X-API-Key header:
                  </p>
                  <CodeBlock code={`X-API-Key: nano_xxxxxxxxxxxxxxxx`} />
                  <p className="text-sm text-muted-foreground mt-3">
                    <strong>Benefits:</strong> Users registered via external API are auto-approved after email verification (no admin approval needed). 
                    The verification email will show your API key name as the app name.
                  </p>
                </div>
                <h2 className="text-lg font-semibold mb-4">External API Endpoints</h2>
                {externalEndpoints.map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
