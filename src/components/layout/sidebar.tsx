'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Car, Search, FileText, Calendar, Settings, LogOut,
  Users, BarChart3, Shield, BookOpen, Sparkles, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/notification-bell';

const ownerLinks = [
  { href: '/owner/vehicles', label: 'My Vehicles', icon: Car },
  { href: '/owner/options', label: 'Options', icon: FileText },
  { href: '/owner/settings', label: 'Settings', icon: Settings },
];

const productionLinks = [
  { href: '/production/search', label: 'Search Vehicles', icon: Search },
  { href: '/production/options', label: 'My Options', icon: FileText },
  { href: '/production/projects', label: 'Projects', icon: FolderOpen },
  { href: '/production/settings', label: 'Settings', icon: Settings },
];

const coordinatorLinks = [
  { href: '/coordinator/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/coordinator/settings', label: 'Settings', icon: Settings },
];

const adminLinks = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { href: '/admin/documents', label: 'Documents', icon: Shield },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/special-requests', label: 'Special Requests', icon: Sparkles },
  { href: '/admin/audit-log', label: 'Audit Log', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const links = role === 'ADMIN' ? adminLinks : role === 'COORDINATOR' ? coordinatorLinks : role === 'OWNER' ? ownerLinks : productionLinks;
  const homeHref = role === 'ADMIN' ? '/admin/analytics' : role === 'COORDINATOR' ? '/coordinator/bookings' : role === 'OWNER' ? '/owner/vehicles' : '/production/search';

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-white/10 lg:bg-gray-900 lg:sticky lg:top-0 lg:h-screen overflow-visible z-50">
      <div className="relative flex items-center justify-between h-16 px-6 border-b border-white/10 overflow-visible">
        <Link href={homeHref} className="text-xl font-bold text-white">
          VehicleReel
        </Link>
        <NotificationBell />
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {session?.user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-white/50 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
