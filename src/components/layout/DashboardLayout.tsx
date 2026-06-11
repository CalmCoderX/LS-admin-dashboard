'use client';

import { useState, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Building2,
  Settings,
  Shield,
  FileText,
  Activity,
  Database,
  AlertTriangle,
  BookOpen,
  Menu,
  X,
  LogOut,
  User,
  Package,
  DollarSign,
  UserCheck,
  Cpu,
  Ticket,
  Clock,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/ThemeToggle';
import logoImage from '@/assets/images/logo.png';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'System overview and metrics',
  },
  {
    name: 'User Management',
    href: '/dashboard/users',
    icon: Users,
    description: 'Manage users and permissions',
  },
  {
    name: 'Organizations',
    href: '/dashboard/organizations',
    icon: Building2,
    description: 'Organization control center',
  },
  {
    name: 'Tier Management',
    href: '/dashboard/tiers',
    icon: Package,
    description: 'Manage subscription tiers',
  },
  {
    name: 'Plan Management',
    href: '/dashboard/plans',
    icon: DollarSign,
    description: 'Manage billing plans',
  },
  {
    name: 'Activation Codes',
    href: '/dashboard/activation-codes',
    icon: Ticket,
    description: 'Manage free trial activation codes',
  },
  {
    name: 'Free Trials',
    href: '/dashboard/free-trials',
    icon: Clock,
    description: 'Manage organizations with free trials',
  },
  {
    name: 'Quota & Limits',
    href: '/dashboard/quotas',
    icon: Database,
    description: 'Usage limits and quotas',
  },
  {
    name: 'Security',
    href: '/dashboard/security',
    icon: Shield,
    description: 'Rate limiting and security',
  },
  {
    name: 'Law Packs',
    href: '/dashboard/law-packs',
    icon: BookOpen,
    description: 'Legal document management',
  },
  {
    name: 'Audit Logs',
    href: '/dashboard/audit',
    icon: FileText,
    description: 'System activity and compliance',
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    description: 'Generated reports and files',
  },
  {
    name: 'System Health',
    href: '/dashboard/system',
    icon: Activity,
    description: 'Monitoring and maintenance',
  },
  {
    name: 'Impersonation History',
    href: '/dashboard/impersonation-history',
    icon: UserCheck,
    description: 'Track impersonation activities',
  },
  {
    name: 'Role Mappings',
    href: '/dashboard/role-mappings',
    icon: Users,
    description: 'Configure Auth0 to backend role mappings',
  },
  {
    name: 'Engine Management',
    href: '/dashboard/engines',
    icon: Cpu,
    description: 'Manage processing engines',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Auth0 Configuration',
  }
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Save scroll position before navigation
  const saveScrollPosition = () => {
    if (navRef.current) {
      localStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
    }
  };

  // Restore scroll position after navigation
  const restoreScrollPosition = () => {
    const savedPosition = localStorage.getItem('sidebar-scroll-position');
    if (navRef.current && savedPosition) {
      navRef.current.scrollTop = parseInt(savedPosition, 10);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNavClick = (href: string) => {
    // Don't navigate if already on the same page (but allow exact dashboard route)
    const isCurrentPage = href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/');

    if (isCurrentPage) {
      return;
    }

    // Save scroll position immediately when clicking navigation
    saveScrollPosition();
    setSidebarOpen(false);

    // Navigate immediately
    router.push(href);
  };


  // Set up scroll position preservation
  useEffect(() => {
    const navElement = navRef.current;
    if (navElement) {
      // Restore scroll position on mount/pathname change
      restoreScrollPosition();

      // Save scroll position when scrolling
      const handleScroll = () => {
        saveScrollPosition();
      };

      navElement.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        navElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [pathname]); // Re-run when pathname changes to restore position

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-custom-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-bg-light-6 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                <Image
                  src={logoImage}
                  alt="Lexa Shield Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary dark:text-gray-100">Lexa Shield</h1>
                <p className="text-xs text-text-secondary dark:text-gray-400">Super Administrator</p>
              </div>
            </div>
            <button
              className="lg:hidden p-1 rounded-lg hover:bg-bg-light-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav ref={navRef} className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation
              .map((item) => {
              // Special handling for the main dashboard route
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname.startsWith(item.href + '/');

              const shouldHighlight = isActive;

              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={clsx(
                    'sidebar-link group transform transition-all duration-150 w-full text-left',
                    shouldHighlight && 'sidebar-link-active'
                  )}
                  title={item.description}
                >
                  <item.icon
                    className={clsx(
                      'w-5 h-5 transition-colors duration-150',
                      shouldHighlight ? 'text-white' : 'text-text-secondary'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'text-sm font-medium truncate transition-colors duration-150',
                      shouldHighlight ? 'text-white' : 'text-text-primary'
                    )}>
                      {item.name}
                    </p>
                    <p className={clsx(
                      'text-xs truncate transition-colors duration-150',
                      shouldHighlight ? 'text-gray-100' : 'text-text-secondary'
                    )}>
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-bg-light-6 dark:border-gray-700">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-light-1 dark:bg-gray-700">
              <div className="w-8 h-8 bg-brand-navy dark:bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary dark:text-gray-100 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-1 text-text-secondary hover:text-status-error transition-colors disabled:opacity-60"
                title={isLoggingOut ? 'Signing out...' : 'Logout'}
                aria-busy={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-bg-light-6 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-bg-light-1"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-bg-main dark:bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
