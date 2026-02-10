import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation as useRouterLocation, Outlet, useNavigate } from 'react-router-dom';
import { useLocation } from '@/contexts/LocationContext';
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
  BarChart3,
  Menu,
  X,
  Search,
  UserCircle,
  Phone,
  UserCog,
  ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import ChatBot from '@/components/chatbot/ChatBot';
import BrandWatermark from '@/components/layout/BrandWatermark';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

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
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const { user, logout, devMode, switchRole } = useAuth();
  const { alerts } = useLocation();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const alertsDropdownRef = useRef(null);

  // Close alerts dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (alertsDropdownRef.current && !alertsDropdownRef.current.contains(event.target)) {
        setShowAlertsDropdown(false);
      }
    };

    if (showAlertsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAlertsDropdown]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserTypeLabel = (type) => {
    const labels = {
      student: 'Student',
      scientist: 'Scientist',
      admin: 'Administrator',
      citizen: 'Citizen'
    };
    return labels[type] || 'User';
  };

  // Base navigation items for all users (citizen)
  const baseNavItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/app/dashboard' },
    { icon: Map, label: t('nav.map'), path: '/app/map' },
    { icon: Bell, label: t('nav.alerts'), path: '/app/alerts' },
    { icon: CloudRain, label: t('nav.weather'), path: '/app/weather' },
    { icon: Flame, label: t('nav.disasters'), path: '/app/disasters' },
    { icon: BarChart3, label: t('nav.analytics'), path: '/app/analytics' },
    { icon: Users, label: t('nav.community'), path: '/app/community' },
    { icon: Phone, label: t('nav.contacts'), path: '/app/critical-contacts' },
  ];

  // Role-specific navigation items
  const roleNavItems = {
    student: { icon: GraduationCap, label: 'Student Portal', path: '/app/student' },
    scientist: { icon: Microscope, label: 'Scientist Portal', path: '/app/scientist' },
    admin: { icon: ShieldAlert, label: 'Admin Dashboard', path: '/app/admin' },
  };

  // Build navigation items based on user role
  const getNavItems = () => {
    const items = [...baseNavItems];
    const userRole = user?.role || 'citizen';

    if (userRole === 'developer') {
      // Developer sees ALL tabs for testing
      items.push(roleNavItems.student);
      items.push(roleNavItems.scientist);
      items.push(roleNavItems.admin);
    } else if (userRole === 'admin') {
      // Admin sees all tabs
      items.push(roleNavItems.student);
      items.push(roleNavItems.scientist);
      items.push(roleNavItems.admin);
    } else if (userRole === 'student') {
      // Student sees base + student tab
      items.push(roleNavItems.student);
    } else if (userRole === 'scientist') {
      // Scientist sees base + scientist tab
      items.push(roleNavItems.scientist);
    }
    // Citizen sees only base tabs

    return items;
  };

  const navItems = getNavItems();

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
            <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
              <img src="/main_logo.png" alt="Suraksha Setu" className="h-12 w-12 object-contain" />
              <span className="text-primary">Suraksha<span className="text-foreground"> Setu</span></span>
            </div>
          )}
          {collapsed && <img src="/main_logo.png" alt="Logo" className="h-12 w-12 object-contain mx-auto" />}
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
              active={routerLocation.pathname === item.path} 
              collapsed={collapsed}
            />
          ))}
        </div>

        <div className="p-4 border-t border-border">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{user?.name || 'User'}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{user ? getUserTypeLabel(user.user_type) : 'Citizen'}</span>
                    {user?.role && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 🔧 DEV MODE: Role Switcher */}
              {devMode && user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                      <div className="flex items-center gap-1">
                        <UserCog className="w-3 h-3" />
                        <span>Switch Role</span>
                      </div>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs">
                      Dev Tools - Quick Switch
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => switchRole('developer')} className="text-xs">
                      <UserCog className="w-3 h-3 mr-2 text-purple-600" />
                      Developer (All Access)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => switchRole('admin')} className="text-xs">
                      <ShieldAlert className="w-3 h-3 mr-2 text-red-600" />
                      Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => switchRole('scientist')} className="text-xs">
                      <Microscope className="w-3 h-3 mr-2 text-blue-600" />
                      Scientist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => switchRole('student')} className="text-xs">
                      <GraduationCap className="w-3 h-3 mr-2 text-green-600" />
                      Student
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => switchRole('citizen')} className="text-xs">
                      <Users className="w-3 h-3 mr-2 text-gray-600" />
                      Citizen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
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
            {devMode && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hidden md:flex">
                <UserCog className="w-3 h-3 mr-1" />
                DEV MODE
              </Badge>
            )}
            {/* Dynamic Alert Badge - Only show if there are critical alerts */}
            {alerts && alerts.length > 0 && alerts.some(a => a.severity === 'critical' || a.severity === 'red') && (
              <div 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm font-medium animate-pulse cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => navigate('/app/alerts')}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
                {alerts.find(a => a.severity === 'critical' || a.severity === 'red')?.title || 'Critical Alert'}
              </div>
            )}
            {/* Language Switcher */}
            <LanguageSwitcher />
            {/* Bell Icon with Alerts Dropdown */}
            <div className="relative" ref={alertsDropdownRef}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {alerts && alerts.length > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background animate-pulse"></span>
                )}
              </Button>
              
              {/* Alerts Dropdown */}
              {showAlertsDropdown && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Alerts ({alerts?.length || 0})
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white hover:bg-white/20 rounded-lg"
                      onClick={() => setShowAlertsDropdown(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto scrollbar-thin">
                    {alerts && alerts.length > 0 ? (
                      <div className="divide-y divide-border">
                        {alerts.slice(0, 5).map((alert, idx) => (
                          <div
                            key={alert.id || idx}
                            className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              navigate('/app/alerts');
                              setShowAlertsDropdown(false);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                alert.severity === 'critical' || alert.severity === 'red'
                                  ? 'bg-red-500 animate-pulse'
                                  : alert.severity === 'warning' || alert.severity === 'orange'
                                  ? 'bg-orange-500'
                                  : 'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-foreground truncate">
                                  {alert.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {alert.description || alert.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {alert.location || 'Unknown'} • {new Date(alert.issued_at || alert.time).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No active alerts</p>
                        <p className="text-xs mt-1">You're all good for now!</p>
                      </div>
                    )}
                  </div>
                  {alerts && alerts.length > 0 && (
                    <div className="border-t border-border p-2 bg-muted/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs hover:bg-muted"
                        onClick={() => {
                          navigate('/app/alerts');
                          setShowAlertsDropdown(false);
                        }}
                      >
                        View All Alerts →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Brand Watermark - Bottom Right Logo */}
      <BrandWatermark />

      {/* Floating Chatbot */}
      <ChatBot />
    </div>
  );
};

export default MainLayout;
