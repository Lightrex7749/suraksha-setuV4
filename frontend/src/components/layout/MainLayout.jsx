import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Bell, 
  CloudRain, 
  Flame, 
  Users, 
  GraduationCap, 
  Microscope, 
  ShieldAlert,
  Menu,
  X,
  Search,
  UserCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const SidebarItem = ({ icon: Icon, label, path, active, collapsed }) => (
  <Link 
    to={path}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
      ${active 
        ? 'bg-primary/10 text-primary font-medium' 
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
  >
    <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
    {!collapsed && <span>{label}</span>}
    {collapsed && <div className="absolute left-16 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 pointer-events-none shadow-md z-50 whitespace-nowrap border">{label}</div>}
  </Link>
);

const MainLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Map, label: 'Live Map', path: '/map' },
    { icon: Bell, label: 'Alerts Center', path: '/alerts' },
    { icon: CloudRain, label: 'Weather & AQI', path: '/weather' },
    { icon: Flame, label: 'Disasters', path: '/disasters' },
    { icon: Users, label: 'Community', path: '/community' },
    { icon: GraduationCap, label: 'Student Portal', path: '/student' },
    { icon: Microscope, label: 'Scientist Portal', path: '/scientist' },
    { icon: ShieldAlert, label: 'Admin', path: '/admin' },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-4 border-b border-border justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
              <ShieldAlert className="h-6 w-6" />
              <span>Suraksha<span className="text-foreground">AI</span></span>
            </div>
          )}
          {collapsed && <ShieldAlert className="h-6 w-6 text-primary mx-auto" />}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex h-8 w-8 ml-auto" 
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8 ml-auto" 
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.path} 
              {...item} 
              active={location.pathname === item.path} 
              collapsed={collapsed}
            />
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">John Doe</span>
                <span className="text-xs text-muted-foreground">Safety Officer</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${collapsed ? 'md:ml-16' : 'md:ml-64'}
        `}
      >
        {/* Header */}
        <header className="h-16 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex items-center relative max-w-md w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search alerts, locations..." 
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm font-medium animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              Cyclone Alert: Odisha Coast
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background"></span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
