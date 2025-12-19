import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuthFetch } from "@/lib/auth";
import type { Project } from "@shared/schema";

export default function ProjectsPage() {
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const [newProject, setNewProject] = useState({ name: "", description: "" });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/admin/projects"],
    queryFn: async () => {
      const response = await authFetch("/api/admin/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/admin/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projects"] });
      setNewProject({ name: "", description: "" });
      toast({ title: "Project created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({ title: "Project name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(newProject);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-projects-title">
              Projects
            </h1>
            <p className="text-muted-foreground mt-2">Manage your projects and resources</p>
          </div>
        </div>

        {/* Create new project */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </CardTitle>
            <CardDescription>Create a new project to manage databases and APIs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                placeholder="My Project"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Project description (optional)"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                data-testid="input-project-description"
              />
            </div>
            <Button
              onClick={handleCreateProject}
              disabled={createMutation.isPending}
              data-testid="button-create-project"
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </CardContent>
        </Card>

        {/* Projects list */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Projects</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No projects yet. Create your first project above.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project: Project) => (
                <Card
                  key={project.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-project-${project.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1">{project.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-edit-project-${project.id}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        data-testid={`button-delete-project-${project.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
