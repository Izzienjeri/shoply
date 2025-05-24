'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, UserCog, LogOutIcon, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from '../ui/separator';


export function Navbar() {
   const { isAuthenticated, isLoading, logout, isAdmin } = useAuth();
   const { itemCount } = useCart();
   const pathname = usePathname();

   const isInAdminSection = pathname.startsWith('/admin');

   const publicNavLinks = [
     { href: "/artworks", label: "Artwork" },
     { href: "/artists", label: "Artists" },
   ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={isAdmin && isInAdminSection ? "/admin" : "/"} className="text-xl font-bold font-serif text-primary">
          Artistry Haven {isInAdminSection && isAdmin && <span className="text-sm font-normal text-muted-foreground">- Admin</span>}
        </Link>

        {!isInAdminSection && (
          <div className="hidden md:flex items-center space-x-6">
            {publicNavLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                </Link>
            ))}
          </div>
        )}
        {isInAdminSection && isAdmin && (
             <div className="hidden md:flex items-center space-x-6">
                <Link href="/admin/artworks" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Artworks
                </Link>
                <Link href="/admin/artists" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Artists
                </Link>
                 <Link href="/admin/orders" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Orders
                </Link>
             </div>
        )}


        <div className="flex items-center space-x-2 sm:space-x-4">
          {!isInAdminSection && (
            <Link href="/cart" aria-label="View Cart">
               <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {isAuthenticated && itemCount > 0 && (
                     <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-xs">
                        {itemCount > 9 ? '9+' : itemCount}
                     </Badge>
                  )}
               </Button>
            </Link>
          )}

          {isLoading ? (
             <Button variant="ghost" size="sm" disabled>Loading...</Button>
          ) : isAuthenticated ? (
             <>
              {isAdmin && (
                <Link href={isInAdminSection ? "/" : "/admin"} title={isInAdminSection ? "Back to Site" : "Admin Dashboard"}>
                  <Button variant="ghost" size="icon">
                    {isInAdminSection ? <LogOutIcon className="h-5 w-5 transform rotate-180" /> : <UserCog className="h-5 w-5" />}
                  </Button>
                </Link>
              )}
              {!isInAdminSection && (
                <Link href="/orders">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">My Orders</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">Logout</Button>
             </>
          ) : (
             <>
             <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
             </Link>
             <Link href="/signup">
                <Button size="sm">Sign Up</Button>
             </Link>
             </>
          )}

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <div className="p-4">
                    <Link href={isAdmin && isInAdminSection ? "/admin" : "/"} className="text-lg font-bold font-serif text-primary mb-4 block">
                      Artistry Haven
                    </Link>
                    <Separator className="my-3"/>
                    
                    {isInAdminSection && isAdmin ? (
                        <>
                            <SheetClose asChild><Link href="/admin" className="flex items-center py-2 text-sm text-foreground hover:text-primary">Dashboard</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/artworks" className="flex items-center py-2 text-sm text-foreground hover:text-primary">Manage Artworks</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/artists" className="flex items-center py-2 text-sm text-foreground hover:text-primary">Manage Artists</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/orders" className="flex items-center py-2 text-sm text-foreground hover:text-primary">Manage Orders</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/delivery-options" className="flex items-center py-2 text-sm text-foreground hover:text-primary">Delivery Options</Link></SheetClose>
                            <Separator className="my-3"/>
                            <SheetClose asChild><Link href="/" className="flex items-center py-2 text-sm text-foreground hover:text-primary">Back to Site</Link></SheetClose>
                        </>
                    ) : (
                        <>
                            {publicNavLinks.map(link => (
                                <SheetClose asChild key={link.href}><Link href={link.href} className="flex items-center py-2 text-sm text-foreground hover:text-primary">{link.label}</Link></SheetClose>
                            ))}
                            {isAuthenticated && (
                                <SheetClose asChild><Link href="/orders" className="flex items-center py-2 text-sm text-foreground hover:text-primary">My Orders</Link></SheetClose>
                            )}
                        </>
                    )}
                    <Separator className="my-3"/>
                    {isAuthenticated ? (
                        <Button variant="outline" size="sm" onClick={() => {logout();}} className="w-full">Logout</Button>
                    ) : (
                        <div className="space-y-2">
                           <SheetClose asChild><Link href="/login" className="w-full"><Button variant="ghost" className="w-full">Login</Button></Link></SheetClose>
                           <SheetClose asChild><Link href="/signup" className="w-full"><Button className="w-full">Sign Up</Button></Link></SheetClose>
                        </div>
                    )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
}