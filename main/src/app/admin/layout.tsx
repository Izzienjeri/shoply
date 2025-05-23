import { ReactNode } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Home, Package, Users, Settings, BarChart3, ShoppingBag, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function AdminNavbar() {

    return (
        <nav className="bg-gray-800 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/admin" className="text-xl font-semibold">
                    Artistry Haven - Admin
                </Link>
            </div>
        </nav>
    );
}

function AdminSidebar() {
    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: Home },
        { href: '/admin/artworks', label: 'Artworks', icon: Package },
        { href: '/admin/artists', label: 'Artists', icon: Users },
        { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
        { href: '/admin/delivery-options', label: 'Delivery', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-gray-100 dark:bg-gray-900 p-6 border-r dark:border-gray-700 flex flex-col">
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
            <div className="mt-auto">
                 <Link href="/"
                    className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                 >
                    <LogOut className="mr-3 h-5 w-5" />
                    Back to Site
                 </Link>
            </div>
        </aside>
    );
}


export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <AdminNavbar />
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