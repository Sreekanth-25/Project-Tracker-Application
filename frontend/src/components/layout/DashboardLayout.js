import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Layers, 
  LayoutDashboard, 
  FolderKanban, 
  Sun, 
  Moon, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Layers className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-xl font-bold tracking-tight hidden sm:block">ProjectFlow</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/projects' && location.pathname.startsWith('/projects'));
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="gap-2"
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.5} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hidden sm:flex"
                data-testid="theme-toggle"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Moon className="w-5 h-5" strokeWidth={1.5} />
                )}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden sm:flex" data-testid="user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[100px] truncate">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleTheme} className="sm:hidden">
                    {theme === 'dark' ? (
                      <><Sun className="w-4 h-4 mr-2" /> Light Mode</>
                    ) : (
                      <><Moon className="w-4 h-4 mr-2" /> Dark Mode</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background"
            >
              <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-2"
                      >
                        <item.icon className="w-4 h-4" strokeWidth={1.5} />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 mt-2"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? (
                      <><Sun className="w-4 h-4" /> Light Mode</>
                    ) : (
                      <><Moon className="w-4 h-4" /> Dark Mode</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                    Logout
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
