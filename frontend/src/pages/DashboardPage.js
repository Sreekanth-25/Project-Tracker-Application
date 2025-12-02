import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getProjects, getAnalyticsOverview, getTimeTrackingAnalytics } from '@/services/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  Target, 
  Plus,
  ArrowRight,
  CalendarDays,
  TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [timeAnalytics, setTimeAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, analyticsRes, timeRes] = await Promise.all([
        getProjects(),
        getAnalyticsOverview(),
        getTimeTrackingAnalytics()
      ]);
      setProjects(projectsRes.data);
      setAnalytics(analyticsRes.data);
      setTimeAnalytics(timeRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = analytics ? [
    {
      title: 'Total Projects',
      value: analytics.total_projects,
      icon: FolderKanban,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Tasks Completed',
      value: `${analytics.completed_tasks}/${analytics.total_tasks}`,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Hours Tracked',
      value: `${analytics.total_time_hours}h`,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      title: 'Completion Rate',
      value: `${analytics.task_completion_rate}%`,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    }
  ] : [];

  const pieData = analytics ? [
    { name: 'Completed', value: analytics.completed_tasks, color: '#10B981' },
    { name: 'In Progress', value: analytics.in_progress_tasks, color: '#F59E0B' },
    { name: 'Todo', value: analytics.todo_tasks, color: '#6366F1' }
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your projects</p>
          </div>
          <Link to="/projects/new" data-testid="new-project-btn">
            <Button className="btn-press">
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
              New Project
            </Button>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index} className="card-hover" data-testid={`stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time Tracking Chart */}
          <Card className="lg:col-span-2" data-testid="time-chart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
                Time Tracked (Last 14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeAnalytics?.daily?.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeAnalytics.daily}>
                      <defs>
                        <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${val}h`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelFormatter={(date) => format(parseISO(date), 'MMMM d, yyyy')}
                        formatter={(value) => [`${value} hours`, 'Time']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="hours" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fill="url(#timeGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No time tracking data yet. Start logging time on your tasks!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Distribution */}
          <Card data-testid="task-pie-chart">
            <CardHeader>
              <CardTitle>Task Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="h-[250px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4">
                    {pieData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No tasks yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects and Deadlines Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card data-testid="recent-projects">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>Your latest project activity</CardDescription>
              </div>
              <Link to="/projects">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1.5} />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.slice(0, 4).map((project) => {
                    const completedTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
                    const totalTasks = project.tasks?.length || 0;
                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                    
                    return (
                      <Link key={project.id} to={`/projects/${project.id}`} data-testid={`project-card-${project.id}`}>
                        <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: project.color }}
                                />
                                <h4 className="font-semibold truncate">{project.name}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {project.description || 'No description'}
                              </p>
                            </div>
                            <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                              {project.status}
                            </Badge>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1} />
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Link to="/projects/new">
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Create your first project
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card data-testid="upcoming-deadlines">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" strokeWidth={1.5} />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>Milestones and project deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.upcoming_deadlines?.length > 0 ? (
                <div className="space-y-4">
                  {analytics.upcoming_deadlines.map((deadline, index) => {
                    const dueDate = parseISO(deadline.deadline);
                    const isUrgent = isBefore(dueDate, addDays(new Date(), 3));
                    
                    return (
                      <Link key={index} to={`/projects/${deadline.project_id}`}>
                        <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <div className={`p-2 rounded-lg ${isUrgent ? 'bg-destructive/10' : 'bg-muted'}`}>
                            {deadline.type === 'project' ? (
                              <FolderKanban className={`w-5 h-5 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                            ) : (
                              <Target className={`w-5 h-5 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{deadline.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {deadline.project_name || 'Project deadline'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${isUrgent ? 'text-destructive' : ''}`}>
                              {format(dueDate, 'MMM d')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(dueDate, 'yyyy')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" strokeWidth={1} />
                  <p className="text-muted-foreground">No upcoming deadlines</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
