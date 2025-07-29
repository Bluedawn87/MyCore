"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Flex, Text, Heading, Badge, DropdownMenu, TextField, SegmentedControl, Progress } from "@radix-ui/themes";
import { 
  PlusIcon, 
  DotsVerticalIcon, 
  Pencil1Icon, 
  TrashIcon,
  MagnifyingGlassIcon,
  RocketIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  PauseIcon,
  ArrowRightIcon,
  PersonIcon,
  CalendarIcon,
  ActivityLogIcon
} from "@radix-ui/react-icons";
import { ProjectDrawer } from "@/components/projects/project-drawer";
import { ProjectDetailsModal } from "@/components/projects/project-details-modal";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  project_type: string;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  initial_investment: number | null;
  estimated_value: number | null;
  current_value: number | null;
  investment_id: string | null;
  converted_to_investment_id: string | null;
  website_url: string | null;
  repository_url: string | null;
  notes: string | null;
  project_owners?: ProjectOwner[];
  project_milestones?: Milestone[];
}

interface ProjectOwner {
  id: string;
  person_id: string;
  ownership_percentage: number;
  role: string | null;
  person: { name: string };
}

interface Milestone {
  id: string;
  title: string;
  is_completed: boolean;
  target_date: string | null;
}


type StatusFilter = "all" | "active" | "planning" | "completed" | "on_hold";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select(`
          *,
          project_owners (
            *,
            person:persons(name)
          ),
          project_milestones (
            id,
            title,
            is_completed,
            target_date
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      setProjects(projectsData || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project? This will also delete all related milestones and metrics.")) {
      await supabase.from("projects").delete().eq("id", projectId);
      fetchProjects();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "idea": return "💡";
      case "planning": return "📋";
      case "active": return "🚀";
      case "on_hold": return "⏸️";
      case "completed": return "✅";
      case "cancelled": return "❌";
      case "converted": return "🔄";
      default: return "📁";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "idea": return "gray";
      case "planning": return "blue";
      case "active": return "green";
      case "on_hold": return "orange";
      case "completed": return "cyan";
      case "cancelled": return "red";
      case "converted": return "purple";
      default: return "gray";
    }
  };

  const getProjectProgress = (milestones: Milestone[]) => {
    if (!milestones || milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.is_completed).length;
    return (completed / milestones.length) * 100;
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && project.status === "active") ||
      (statusFilter === "planning" && (project.status === "idea" || project.status === "planning")) ||
      (statusFilter === "completed" && (project.status === "completed" || project.status === "converted")) ||
      (statusFilter === "on_hold" && (project.status === "on_hold" || project.status === "cancelled"));
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Loading projects...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Flex justify="between" align="center">
        <Heading size="8">Projects</Heading>
        <Button onClick={() => setIsProjectDrawerOpen(true)}>
          <PlusIcon /> New Project
        </Button>
      </Flex>

      <Flex gap="4" align="center" wrap="wrap">
        <TextField.Root 
          size="3"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px]"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>

        <SegmentedControl.Root value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="active">Active</SegmentedControl.Item>
          <SegmentedControl.Item value="planning">Planning</SegmentedControl.Item>
          <SegmentedControl.Item value="completed">Completed</SegmentedControl.Item>
          <SegmentedControl.Item value="on_hold">On Hold</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const progress = getProjectProgress(project.project_milestones || []);
          
          return (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('[data-radix-collection-item]') && 
                    !(e.target as HTMLElement).closest('button')) {
                  setSelectedProject(project);
                  setIsDetailsModalOpen(true);
                }
              }}
            >
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start">
                  <Flex gap="2" align="center" className="flex-1 min-w-0">
                    <Text size="5" className="flex-shrink-0">{getStatusIcon(project.status)}</Text>
                    <div className="min-w-0 flex-1">
                      <Heading size="4" className="truncate">{project.name}</Heading>
                      {project.description && (
                        <Text size="2" color="gray" className="line-clamp-2">
                          {project.description}
                        </Text>
                      )}
                    </div>
                  </Flex>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <Button variant="ghost" size="1" className="flex-shrink-0">
                        <DotsVerticalIcon />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                        }}
                      >
                        <Pencil1Icon />
                        Edit Project
                      </DropdownMenu.Item>
                      {project.status === 'active' && !project.converted_to_investment_id && (
                        <>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement convert to investment
                              alert("Convert to investment functionality coming soon!");
                            }}
                          >
                            <ArrowRightIcon />
                            Convert to Investment
                          </DropdownMenu.Item>
                        </>
                      )}
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                      >
                        <TrashIcon />
                        Delete Project
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>

                <Flex gap="2" wrap="wrap">
                  <Badge color={getStatusBadgeColor(project.status)} variant="soft">
                    {project.status}
                  </Badge>
                  <Badge variant="outline">
                    {project.project_type}
                  </Badge>
                </Flex>

                {project.project_milestones && project.project_milestones.length > 0 && (
                  <div>
                    <Flex justify="between" mb="1">
                      <Text size="2" color="gray">Progress</Text>
                      <Text size="2" weight="medium">{Math.round(progress)}%</Text>
                    </Flex>
                    <Progress value={progress} size="2" />
                  </div>
                )}

                <div className="space-y-2">
                  {project.initial_investment && (
                    <Flex justify="between">
                      <Text size="2" color="gray">Investment:</Text>
                      <Text size="2" weight="medium">{formatCurrency(project.initial_investment)}</Text>
                    </Flex>
                  )}
                  {project.target_completion_date && (
                    <Flex justify="between">
                      <Text size="2" color="gray">Target:</Text>
                      <Text size="2" weight="medium">{formatDate(project.target_completion_date)}</Text>
                    </Flex>
                  )}
                </div>

                {project.project_owners && project.project_owners.length > 0 && (
                  <div className="space-y-1">
                    {project.project_owners.slice(0, 2).map((owner) => (
                      <Flex key={owner.id} align="center" gap="2">
                        <PersonIcon className="flex-shrink-0 w-3 h-3" />
                        <Text size="2" className="truncate flex-1">
                          {owner.person.name}
                        </Text>
                        {owner.role && (
                          <Badge size="1" variant="soft">{owner.role}</Badge>
                        )}
                      </Flex>
                    ))}
                    {project.project_owners.length > 2 && (
                      <Text size="2" color="gray">
                        +{project.project_owners.length - 2} more
                      </Text>
                    )}
                  </div>
                )}
              </Flex>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <Flex direction="column" align="center" gap="3" className="py-8">
            <Text color="gray">
              {searchQuery || statusFilter !== "all" ? "No projects match your filters" : "No projects yet"}
            </Text>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsProjectDrawerOpen(true)}>
                <PlusIcon /> Create Your First Project
              </Button>
            )}
          </Flex>
        </Card>
      )}

      <ProjectDrawer
        open={isProjectDrawerOpen || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setIsProjectDrawerOpen(false);
            setEditingProject(null);
          } else if (!editingProject) {
            setIsProjectDrawerOpen(true);
          }
        }}
        project={editingProject}
        onSuccess={() => {
          fetchProjects();
          setIsProjectDrawerOpen(false);
          setEditingProject(null);
        }}
      />

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          onEdit={() => {
            setEditingProject(selectedProject);
            setIsDetailsModalOpen(false);
          }}
          onConvert={() => {
            // TODO: Implement convert to investment
            alert("Convert to investment functionality coming soon!");
          }}
        />
      )}
    </div>
  );
}