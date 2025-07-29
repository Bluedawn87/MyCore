"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  Flex,
  Text,
  Heading,
  Badge,
  Button,
  Card,
  Tabs,
  Progress,
  Separator,
  IconButton,
  TextField,
  Checkbox
} from "@radix-ui/themes";
import {
  CalendarIcon,
  PersonIcon,
  ExternalLinkIcon,
  Pencil1Icon,
  ArrowRightIcon,
  CheckCircledIcon,
  PlusIcon,
  ActivityLogIcon,
  GitHubLogoIcon,
  GlobeIcon
} from "@radix-ui/react-icons";

interface ProjectDetailsModalProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onConvert: () => void;
}

export function ProjectDetailsModal({ project, open, onOpenChange, onEdit, onConvert }: ProjectDetailsModalProps) {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMilestone, setNewMilestone] = useState("");
  const [showMilestoneInput, setShowMilestoneInput] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (open && project) {
      fetchProjectDetails();
    }
  }, [open, project]);

  const fetchProjectDetails = async () => {
    try {
      const [milestonesResult, metricsResult] = await Promise.all([
        supabase
          .from("project_milestones")
          .select("*")
          .eq("project_id", project.id)
          .order("target_date", { ascending: true }),
        supabase
          .from("project_metrics")
          .select("*")
          .eq("project_id", project.id)
          .order("metric_date", { ascending: false })
      ]);

      if (milestonesResult.data) setMilestones(milestonesResult.data);
      if (metricsResult.data) setMetrics(metricsResult.data);
    } catch (error) {
      console.error("Error fetching project details:", error);
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

  const toggleMilestone = async (milestoneId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from("project_milestones")
      .update({ 
        is_completed: !isCompleted,
        completed_date: !isCompleted ? new Date().toISOString() : null
      })
      .eq("id", milestoneId);

    if (!error) {
      fetchProjectDetails();
    }
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("project_milestones")
      .insert({
        project_id: project.id,
        user_id: user.id,
        title: newMilestone,
        is_completed: false
      });

    if (!error) {
      setNewMilestone("");
      setShowMilestoneInput(false);
      fetchProjectDetails();
    }
  };

  const getProjectProgress = () => {
    if (!milestones || milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.is_completed).length;
    return (completed / milestones.length) * 100;
  };

  if (!project) return null;

  const progress = getProjectProgress();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 800, maxHeight: '85vh' }}>
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="3">
            <Text size="6">{getStatusIcon(project.status)}</Text>
            <div>
              <Dialog.Title>{project.name}</Dialog.Title>
              <Badge color={getStatusBadgeColor(project.status)} variant="soft">
                {project.status}
              </Badge>
            </div>
          </Flex>
          <Flex gap="2">
            {project.status === 'active' && !project.converted_to_investment_id && (
              <Button variant="soft" onClick={onConvert}>
                <ArrowRightIcon /> Convert to Investment
              </Button>
            )}
            <Button variant="soft" onClick={onEdit}>
              <Pencil1Icon /> Edit
            </Button>
          </Flex>
        </Flex>

        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="milestones">
              Milestones ({milestones.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="metrics">
              Metrics ({metrics.length})
            </Tabs.Trigger>
          </Tabs.List>

          <div style={{ maxHeight: 'calc(85vh - 200px)', overflowY: 'auto', marginTop: '16px' }}>
            <Tabs.Content value="overview">
              <Flex direction="column" gap="4">
                {/* Progress */}
                {milestones.length > 0 && (
                  <Card>
                    <Heading size="4" mb="3">Progress</Heading>
                    <Flex justify="between" mb="2">
                      <Text size="2" color="gray">Overall completion</Text>
                      <Text size="2" weight="medium">{Math.round(progress)}%</Text>
                    </Flex>
                    <Progress value={progress} size="3" />
                    <Text size="2" color="gray" mt="2">
                      {milestones.filter(m => m.is_completed).length} of {milestones.length} milestones completed
                    </Text>
                  </Card>
                )}

                {/* Basic Info */}
                <Card>
                  <Heading size="4" mb="3">Project Information</Heading>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Text size="2" color="gray">Type</Text>
                      <Text size="3" weight="medium" className="capitalize">{project.project_type}</Text>
                    </div>
                    {project.start_date && (
                      <div>
                        <Text size="2" color="gray">Start Date</Text>
                        <Text size="3" weight="medium">{formatDate(project.start_date)}</Text>
                      </div>
                    )}
                    {project.target_completion_date && (
                      <div>
                        <Text size="2" color="gray">Target Completion</Text>
                        <Text size="3" weight="medium">{formatDate(project.target_completion_date)}</Text>
                      </div>
                    )}
                    {project.actual_completion_date && (
                      <div>
                        <Text size="2" color="gray">Completed</Text>
                        <Text size="3" weight="medium">{formatDate(project.actual_completion_date)}</Text>
                      </div>
                    )}
                  </div>
                  {project.description && (
                    <div className="mt-4">
                      <Text size="2" color="gray">Description</Text>
                      <Text size="3">{project.description}</Text>
                    </div>
                  )}
                </Card>

                {/* Financial Info */}
                {(project.initial_investment || project.estimated_value || project.current_value) && (
                  <Card>
                    <Heading size="4" mb="3">Financial Information</Heading>
                    <div className="grid grid-cols-2 gap-4">
                      {project.initial_investment && (
                        <div>
                          <Text size="2" color="gray">Initial Investment</Text>
                          <Text size="3" weight="medium">{formatCurrency(project.initial_investment)}</Text>
                        </div>
                      )}
                      {project.estimated_value && (
                        <div>
                          <Text size="2" color="gray">Estimated Value</Text>
                          <Text size="3" weight="medium">{formatCurrency(project.estimated_value)}</Text>
                        </div>
                      )}
                      {project.current_value && (
                        <div>
                          <Text size="2" color="gray">Current Value</Text>
                          <Text size="3" weight="medium">{formatCurrency(project.current_value)}</Text>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Team */}
                {project.project_owners && project.project_owners.length > 0 && (
                  <Card>
                    <Heading size="4" mb="3">Team</Heading>
                    <Flex direction="column" gap="2">
                      {project.project_owners.map((owner: any) => (
                        <Flex key={owner.id} justify="between" align="center">
                          <Flex gap="2" align="center">
                            <PersonIcon />
                            <Text size="3">{owner.person.name}</Text>
                            {owner.role && (
                              <Badge variant="soft">{owner.role}</Badge>
                            )}
                          </Flex>
                          <Badge variant="outline">{owner.ownership_percentage}%</Badge>
                        </Flex>
                      ))}
                    </Flex>
                  </Card>
                )}

                {/* Links */}
                {(project.website_url || project.repository_url) && (
                  <Card>
                    <Heading size="4" mb="3">Links</Heading>
                    <Flex direction="column" gap="2">
                      {project.website_url && (
                        <a 
                          href={project.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                        >
                          <GlobeIcon />
                          <Text size="3">Website</Text>
                          <ExternalLinkIcon />
                        </a>
                      )}
                      {project.repository_url && (
                        <a 
                          href={project.repository_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                        >
                          <GitHubLogoIcon />
                          <Text size="3">Repository</Text>
                          <ExternalLinkIcon />
                        </a>
                      )}
                    </Flex>
                  </Card>
                )}


                {/* Notes */}
                {project.notes && (
                  <Card>
                    <Heading size="4" mb="3">Notes</Heading>
                    <Text size="3">{project.notes}</Text>
                  </Card>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="milestones">
              <Flex direction="column" gap="4">
                <Flex justify="between" align="center">
                  <Heading size="4">Milestones</Heading>
                  {!showMilestoneInput ? (
                    <Button size="2" onClick={() => setShowMilestoneInput(true)}>
                      <PlusIcon /> Add Milestone
                    </Button>
                  ) : (
                    <Flex gap="2">
                      <TextField.Root
                        value={newMilestone}
                        onChange={(e) => setNewMilestone(e.target.value)}
                        placeholder="Milestone title"
                        onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
                      />
                      <Button size="2" onClick={addMilestone}>Add</Button>
                      <Button size="2" variant="soft" onClick={() => {
                        setShowMilestoneInput(false);
                        setNewMilestone("");
                      }}>
                        Cancel
                      </Button>
                    </Flex>
                  )}
                </Flex>

                {milestones.length === 0 ? (
                  <Card>
                    <Text color="gray" align="center">No milestones yet</Text>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {milestones.map((milestone) => (
                      <Card key={milestone.id}>
                        <Flex justify="between" align="center">
                          <Flex align="center" gap="3">
                            <Checkbox
                              checked={milestone.is_completed}
                              onCheckedChange={() => toggleMilestone(milestone.id, milestone.is_completed)}
                            />
                            <div>
                              <Text 
                                size="3" 
                                weight="medium"
                                style={{
                                  textDecoration: milestone.is_completed ? 'line-through' : 'none',
                                  opacity: milestone.is_completed ? 0.7 : 1
                                }}
                              >
                                {milestone.title}
                              </Text>
                              {milestone.description && (
                                <Text size="2" color="gray">{milestone.description}</Text>
                              )}
                            </div>
                          </Flex>
                          <Flex align="center" gap="2">
                            {milestone.target_date && (
                              <Flex align="center" gap="1">
                                <CalendarIcon />
                                <Text size="2" color="gray">{formatDate(milestone.target_date)}</Text>
                              </Flex>
                            )}
                            {milestone.is_completed && milestone.completed_date && (
                              <Badge color="green" variant="soft">
                                <CheckCircledIcon />
                                {formatDate(milestone.completed_date)}
                              </Badge>
                            )}
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </div>
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="metrics">
              <Flex direction="column" gap="4">
                <Heading size="4">Project Metrics</Heading>

                {metrics.length === 0 ? (
                  <Card>
                    <Text color="gray" align="center">No metrics recorded yet</Text>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {metrics.map((metric) => (
                      <Card key={metric.id}>
                        <Flex justify="between" align="center">
                          <div>
                            <Text size="3" weight="medium">{metric.metric_name}</Text>
                            <Text size="2" color="gray">
                              {metric.metric_type} • {formatDate(metric.metric_date)}
                            </Text>
                          </div>
                          <Text size="4" weight="bold" color="blue">
                            {typeof metric.metric_value === 'object' 
                              ? JSON.stringify(metric.metric_value) 
                              : metric.metric_value}
                          </Text>
                        </Flex>
                        {metric.notes && (
                          <Text size="2" color="gray" mt="2">{metric.notes}</Text>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Flex>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}