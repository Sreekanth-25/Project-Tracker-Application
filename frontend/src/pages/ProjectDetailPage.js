import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getProject, 
  updateProject, 
  deleteProject,
  createTask, 
  updateTask, 
  deleteTask,
  addTimeEntry,
  deleteTimeEntry,
  createMilestone,
  updateMilestone,
  deleteMilestone
} from '@/services/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  Clock,
  Calendar,
  Target,
  Edit2,
  Play,
  Square,
  Flag,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500' },
  { value: 'high', label: 'High', color: 'text-red-500' }
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' }
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  
  // Dialogs
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', due_date: '', estimated_hours: '' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTimeEntry, setNewTimeEntry] = useState({ description: '', duration_minutes: 30, date: format(new Date(), 'yyyy-MM-dd') });
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', due_date: '' });
  const [editProject, setEditProject] = useState({ name: '', description: '', deadline: '', status: 'active' });
  
  // Timer state
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchProject = async () => {
    try {
      const response = await getProject(id);
      setProject(response.data);
      setEditProject({
        name: response.data.name,
        description: response.data.description || '',
        deadline: response.data.deadline ? response.data.deadline.split('T')[0] : '',
        status: response.data.status
      });
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await updateProject(id, editProject);
      setProject(response.data);
      setEditDialogOpen(false);
      toast.success('Project updated');
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject(id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    try {
      const taskData = {
        ...newTask,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null
      };
      const response = await createTask(id, taskData);
      setProject(prev => ({
        ...prev,
        tasks: [...(prev.tasks || []), response.data]
      }));
      setTaskDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '', estimated_hours: '' });
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const response = await updateTask(id, taskId, updates);
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? response.data : t)
      }));
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(id, taskId);
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleAddTimeEntry = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      const response = await addTimeEntry(id, selectedTask.id, newTimeEntry);
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => {
          if (t.id === selectedTask.id) {
            return {
              ...t,
              time_entries: [...(t.time_entries || []), response.data]
            };
          }
          return t;
        })
      }));
      setTimeDialogOpen(false);
      setNewTimeEntry({ description: '', duration_minutes: 30, date: format(new Date(), 'yyyy-MM-dd') });
      setSelectedTask(null);
      toast.success('Time logged');
    } catch (error) {
      toast.error('Failed to log time');
    }
  };

  const handleStartTimer = (task) => {
    setActiveTimer(task.id);
    setTimerSeconds(0);
  };

  const handleStopTimer = async (task) => {
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    try {
      const response = await addTimeEntry(id, task.id, {
        description: 'Timer session',
        duration_minutes: minutes,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setProject(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => {
          if (t.id === task.id) {
            return {
              ...t,
              time_entries: [...(t.time_entries || []), response.data]
            };
          }
          return t;
        })
      }));
      toast.success(`Logged ${minutes} minutes`);
    } catch (error) {
      toast.error('Failed to log time');
    }
    setActiveTimer(null);
    setTimerSeconds(0);
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.title.trim() || !newMilestone.due_date) {
      toast.error('Title and due date are required');
      return;
    }
    try {
      const response = await createMilestone(id, newMilestone);
      setProject(prev => ({
        ...prev,
        milestones: [...(prev.milestones || []), response.data]
      }));
      setMilestoneDialogOpen(false);
      setNewMilestone({ title: '', description: '', due_date: '' });
      toast.success('Milestone created');
    } catch (error) {
      toast.error('Failed to create milestone');
    }
  };

  const handleToggleMilestone = async (milestone) => {
    try {
      const response = await updateMilestone(id, milestone.id, !milestone.completed);
      setProject(prev => ({
        ...prev,
        milestones: prev.milestones.map(m => m.id === milestone.id ? response.data : m)
      }));
      toast.success(milestone.completed ? 'Milestone reopened' : 'Milestone completed!');
    } catch (error) {
      toast.error('Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      await deleteMilestone(id, milestoneId);
      setProject(prev => ({
        ...prev,
        milestones: prev.milestones.filter(m => m.id !== milestoneId)
      }));
      toast.success('Milestone deleted');
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTaskTimeLogged = (task) => {
    const minutes = (task.time_entries || []).reduce((sum, te) => sum + (te.duration_minutes || 0), 0);
    return Math.round(minutes / 60 * 10) / 10;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Loading project...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) return null;

  const tasks = project.tasks || [];
  const milestones = project.milestones || [];
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalHours = tasks.reduce((sum, t) => sum + getTaskTimeLogged(t), 0);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" strokeWidth={1.5} />
              Back to Projects
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
              <h1 className="text-3xl font-bold tracking-tight" data-testid="project-title">{project.name}</h1>
              <Badge variant={project.status === 'completed' ? 'default' : project.status === 'on_hold' ? 'secondary' : 'outline'}>
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)} data-testid="edit-project-btn">
              <Edit2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} data-testid="delete-project-btn">
              <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Delete
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasks</p>
                  <p className="text-xl font-bold">{completedTasks}/{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Target className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-xl font-bold">{progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Logged</p>
                  <p className="text-xl font-bold">{totalHours}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Flag className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Milestones</p>
                  <p className="text-xl font-bold">{milestones.filter(m => m.completed).length}/{milestones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks" data-testid="tasks-tab">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="milestones" data-testid="milestones-tab">Milestones ({milestones.length})</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Tasks</h3>
              <Button onClick={() => setTaskDialogOpen(true)} data-testid="add-task-btn">
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Task
              </Button>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-3">
                {STATUSES.map(status => {
                  const statusTasks = tasks.filter(t => t.status === status.value);
                  if (statusTasks.length === 0) return null;
                  return (
                    <div key={status.value}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        {status.label} ({statusTasks.length})
                      </h4>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {statusTasks.map(task => {
                            const priority = PRIORITIES.find(p => p.value === task.priority);
                            const timeLogged = getTaskTimeLogged(task);
                            const isTimerActive = activeTimer === task.id;
                            
                            return (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="group"
                              >
                                <Card className={`${task.status === 'done' ? 'opacity-60' : ''}`} data-testid={`task-${task.id}`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={task.status === 'done'}
                                        onCheckedChange={(checked) => handleUpdateTask(task.id, { status: checked ? 'done' : 'todo' })}
                                        className="mt-1"
                                        data-testid={`task-checkbox-${task.id}`}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`font-medium ${task.status === 'done' ? 'line-through' : ''}`}>
                                            {task.title}
                                          </span>
                                          <Badge variant="outline" className={`text-xs ${priority?.color}`}>
                                            {priority?.label}
                                          </Badge>
                                          {task.due_date && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {format(parseISO(task.due_date), 'MMM d')}
                                            </span>
                                          )}
                                        </div>
                                        {task.description && (
                                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {timeLogged}h logged
                                            {task.estimated_hours && ` / ${task.estimated_hours}h est.`}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {/* Timer */}
                                        {isTimerActive ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono text-primary">{formatTimer(timerSeconds)}</span>
                                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleStopTimer(task)}>
                                              <Square className="w-4 h-4" strokeWidth={1.5} />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartTimer(task)} data-testid={`start-timer-${task.id}`}>
                                            <Play className="w-4 h-4" strokeWidth={1.5} />
                                          </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedTask(task); setTimeDialogOpen(true); }} data-testid={`log-time-${task.id}`}>
                                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                              <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleUpdateTask(task.id, { status: 'todo' })}>
                                              Set as To Do
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdateTask(task.id, { status: 'in_progress' })}>
                                              Set as In Progress
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUpdateTask(task.id, { status: 'done' })}>
                                              Set as Done
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              className="text-destructive"
                                              onClick={() => handleDeleteTask(task.id)}
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1} />
                  <p className="text-muted-foreground mb-4">No tasks yet</p>
                  <Button onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first task
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Milestones</h3>
              <Button onClick={() => setMilestoneDialogOpen(true)} data-testid="add-milestone-btn">
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Milestone
              </Button>
            </div>

            {milestones.length > 0 ? (
              <div className="space-y-4">
                {milestones
                  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                  .map((milestone) => {
                    const dueDate = parseISO(milestone.due_date);
                    const daysUntil = differenceInDays(dueDate, new Date());
                    const isOverdue = daysUntil < 0 && !milestone.completed;
                    const isUrgent = daysUntil <= 3 && daysUntil >= 0 && !milestone.completed;
                    
                    return (
                      <Card key={milestone.id} className={milestone.completed ? 'opacity-60' : ''} data-testid={`milestone-${milestone.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={milestone.completed}
                              onCheckedChange={() => handleToggleMilestone(milestone)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-semibold ${milestone.completed ? 'line-through' : ''}`}>
                                  {milestone.title}
                                </h4>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                                {isUrgent && (
                                  <Badge variant="outline" className="text-xs text-amber-500 border-amber-500">
                                    Due soon
                                  </Badge>
                                )}
                              </div>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                              )}
                              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(dueDate, 'MMMM d, yyyy')}
                                {!milestone.completed && (
                                  <span className="ml-2">
                                    ({daysUntil === 0 ? 'Today' : daysUntil > 0 ? `${daysUntil} days left` : `${Math.abs(daysUntil)} days ago`})
                                  </span>
                                )}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteMilestone(milestone.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1} />
                  <p className="text-muted-foreground mb-4">No milestones yet</p>
                  <Button onClick={() => setMilestoneDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first milestone
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>Create a new task for this project</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                data-testid="task-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                  <SelectTrigger data-testid="task-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g. 2.5"
                value={newTask.estimated_hours}
                onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-task-btn">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Time Entry Dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Add time spent on "{selectedTask?.title}"</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTimeEntry} className="space-y-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={newTimeEntry.duration_minutes}
                onChange={(e) => setNewTimeEntry({...newTimeEntry, duration_minutes: parseInt(e.target.value) || 0})}
                data-testid="time-duration-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newTimeEntry.date}
                onChange={(e) => setNewTimeEntry({...newTimeEntry, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="What did you work on?"
                value={newTimeEntry.description}
                onChange={(e) => setNewTimeEntry({...newTimeEntry, description: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTimeDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-time-btn">Log Time</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>Create a new milestone for this project</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Milestone title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                data-testid="milestone-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={newMilestone.due_date}
                onChange={(e) => setNewMilestone({...newMilestone, due_date: e.target.value})}
                data-testid="milestone-due-date-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="submit-milestone-btn">Create Milestone</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editProject.name}
                onChange={(e) => setEditProject({...editProject, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editProject.description}
                onChange={(e) => setEditProject({...editProject, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editProject.status} onValueChange={(v) => setEditProject({...editProject, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={editProject.deadline}
                onChange={(e) => setEditProject({...editProject, deadline: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
