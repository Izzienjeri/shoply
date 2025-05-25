'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Home, Package, Users, Settings, ShoppingBag, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


function AdminSidebar() {
    const { logout } = useAuth();

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: Home },
        { href: '/admin/artworks', label: 'Artworks', icon: Package },
        { href: '/admin/artists', label: 'Artists', icon: Users },
        { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
        { href: '/admin/delivery-options', label: 'Delivery', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-gray-100 dark:bg-gray-900 p-6 border-r dark:border-gray-700 flex flex-col">
            <div className="mb-8">
                <Link href="/admin" className="block text-center md:text-left">
                    <h1 className="text-xl font-bold font-serif text-primary">Artistry Haven</h1>
                    <span className="text-sm text-muted-foreground">Admin Panel</span>
                </Link>
            </div>
            <nav className="space-y-2 flex-grow">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-600 space-y-2">
                 <Link href="/"
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                 >
                    <Home className="mr-3 h-5 w-5" />
                    Back to Site
                 </Link>
                 <Button
                    onClick={async () => {
                        await logout();
                    }}
                    variant="ghost"
                    className="w-full justify-start text-left px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-500 rounded-md transition-colors"
                 >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                 </Button>
            </div>
        </aside>
    );
}


export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}