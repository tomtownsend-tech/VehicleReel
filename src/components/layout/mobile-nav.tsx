'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = session?.user?.role;
  const links = role === 'ADMIN'
    ? [
        { href: '/admin/analytics', label: 'Analytics' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/vehicles', label: 'Vehicles' },
        { href: '/admin/documents', label: 'Documents' },
      ]
    : role === 'OWNER'
    ? [
        { href: '/owner/vehicles', label: 'My Vehicles' },
        { href: '/owner/options', label: 'Options' },
        { href: '/owner/settings', label: 'Settings' },
      ]
    : [
        { href: '/production/search', label: 'Search' },
        { href: '/production/options', label: 'My Options' },
        { href: '/production/settings', label: 'Settings' },
      ];

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white">
        <Link href="/" className="text-xl font-bold text-gray-900">
          VehicleReel
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/${role?.toLowerCase()}/settings`} className="p-2 text-gray-600">
            <Bell className="h-5 w-5" />
          </Link>
          <button onClick={() => setOpen(!open)} className="p-2 text-gray-600">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="bg-white border-b border-gray-200 px-4 py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block px-3 py-2 rounded-lg text-sm font-medium',
                pathname.startsWith(link.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Sign out
          </button>
        </nav>
      )}
    </div>
  );
}
