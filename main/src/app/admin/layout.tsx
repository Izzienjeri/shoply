'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Home, Package, Users, Settings, ShoppingBag, LogOut, Bell as BellIcon, Menu, X as XIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';


function AdminSidebar({ isMobile, onLinkClick }: { isMobile: boolean, onLinkClick?: () => void }) {
    const { logout } = useAuth();
    const { unreadCountForBadge, isLoadingGlobal: isNotificationsLoading } = useNotifications();
    const pathname = usePathname();

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: Home },
        { href: '/admin/artworks', label: 'Artworks', icon: Package },
        { href: '/admin/artists', label: 'Artists', icon: Users },
        { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
        { 
          href: '/admin/notifications', 
          label: 'Notifications', 
          icon: BellIcon, 
          badgeCount: isNotificationsLoading ? -1 : unreadCountForBadge
        },
        { href: '/admin/delivery-options', label: 'Delivery', icon: Settings },
    ];

    const sidebarVariants = {
        hidden: { x: "-100%", opacity: 0 },
        visible: { 
            x: 0, 
            opacity: 1, 
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.05, delayChildren: 0.2 } 
        },
        exit: {
            x: "-100%",
            opacity: 0,
            transition: { duration: 0.3, ease: [0.64,0,0.78,0] }
        }
    };

    const navItemVariants = {
        hidden: { x: -20, opacity: 0 },
        visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
        hover: { 
            backgroundColor: "var(--sidebar-accent)", 
            color: "var(--sidebar-accent-foreground)",
            x: 3,
            transition: { duration: 0.15 }
        },
        active: { 
            backgroundColor: "var(--sidebar-primary)", 
            color: "var(--sidebar-primary-foreground)",
            boxShadow: "inset 3px 0 0 0 var(--sidebar-ring)"
        }
    };
    
    const logoVariants = {
      hidden: { opacity:0, y: -10},
      visible: { opacity:1, y: 0, transition: { delay: 0.1, duration: 0.3 }}
    };

    const handleLinkClick = () => {
      if (isMobile && onLinkClick) {
        onLinkClick();
      }
    };

    return (
        <motion.aside 
            className={cn(
                "bg-sidebar dark:bg-gray-900 p-5 border-r border-sidebar-border dark:border-gray-700/60 flex flex-col shadow-lg",
                isMobile ? "fixed inset-y-0 left-0 z-50 w-64" : "w-64 sticky top-0 h-screen"
            )}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit={isMobile ? "exit" : undefined}
        >
            <motion.div className="mb-10 text-center md:text-left" variants={logoVariants}>
                <Link href="/admin" onClick={handleLinkClick}>
                    <h1 className="text-2xl font-bold font-serif text-sidebar-primary">Artistry Haven</h1>
                    <span className="text-sm text-sidebar-foreground/70">Admin Panel</span>
                </Link>
            </motion.div>
            <nav className="space-y-1.5 flex-grow">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                        <motion.div
                            key={item.label}
                            variants={navItemVariants}
                            whileHover="hover"
                            animate={isActive ? "active" : "visible"}
                        >
                            <Link 
                                href={item.href}
                                onClick={handleLinkClick}
                                className={cn(
                                    "flex items-center px-3.5 py-2.5 text-sm font-medium rounded-md transition-all duration-150 ease-out",
                                    isActive 
                                        ? "font-semibold"
                                        : "text-sidebar-foreground/80"
                                )}
                            >
                                <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-inherit" : "text-sidebar-foreground/60 group-hover:text-inherit")} />
                                <span className="flex-grow">{item.label}</span>
                                {item.badgeCount === -1 && (
                                    <Badge variant="secondary" className="ml-auto h-5 w-5 animate-pulse bg-muted-foreground/20 p-0" />
                                )}
                                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                                    <Badge variant="destructive" className="ml-auto text-xs h-5 px-1.5 shadow-sm">
                                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                    </Badge>
                                )}
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>
            <motion.div 
                initial={{ opacity: 0}} 
                animate={{ opacity: 1}} 
                transition={{ delay: 0.3 + navItems.length * 0.05}}
                className="mt-auto pt-5 border-t border-sidebar-border/50 dark:border-gray-600/50"
            >
                 <Button
                    onClick={async () => { 
                        if (isMobile && onLinkClick) onLinkClick();
                        await logout(); 
                    }}
                    variant="ghost"
                    className="w-full justify-start text-left px-3.5 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 rounded-md transition-colors"
                 >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logout
                 </Button>
            </motion.div>
        </motion.aside>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <AdminGuard>
      <div className="min-h-screen flex flex-col bg-muted/30 dark:bg-gray-950 relative">
        {isMobile && (
          <header className="sticky top-0 z-40 flex items-center justify-between p-4 bg-card border-b border-border md:hidden">
            <Link href="/admin" onClick={closeSidebar}>
                <h1 className="text-lg font-bold font-serif text-primary">Artistry Haven Admin</h1>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
              {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </header>
        )}
        <div className="flex flex-1 overflow-hidden">
            <AnimatePresence>
              {(!isMobile || isSidebarOpen) && (
                <AdminSidebar isMobile={!!isMobile} onLinkClick={closeSidebar} />
              )}
            </AnimatePresence>
            {isMobile && isSidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden" 
                onClick={closeSidebar}
                aria-hidden="true"
              />
            )}
          <main className={cn(
            "flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto",
            isMobile && "pt-4"
          )}>
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
