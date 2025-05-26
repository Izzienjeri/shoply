'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { ShoppingCart, UserCog, LogOutIcon, Menu, Search as SearchIcon, X } from 'lucide-react'; 
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
import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { NotificationBell } from '@/components/notifications/NotificationBell';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


export function Navbar() {
   const { isAuthenticated, isLoading, logout, isAdmin } = useAuth();
   const { itemCount } = useCart();
   const pathname = usePathname();
   const router = useRouter(); 
   const searchParams = useSearchParams();

   const [searchTerm, setSearchTerm] = useState('');
   const debouncedSearchTerm = useDebounce(searchTerm, 300); 
   const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
   const mobileSearchInputRef = useRef<HTMLInputElement>(null);
   const desktopSearchInputRef = useRef<HTMLInputElement>(null);

   const isHomePage = pathname === '/';


   useEffect(() => {
    const currentQuery = searchParams.get('q');
    if (pathname === '/search') {
      setSearchTerm(currentQuery || '');
    } else {
        if (!isHomePage) setSearchTerm(''); 
    }
   }, [pathname, searchParams, isHomePage]);


   useEffect(() => {
    const trimmedSearchTerm = debouncedSearchTerm.trim();
    let searchContext = '';
    if (!isHomePage) {
        if (pathname === '/artworks') {
            searchContext = 'artworks';
        } else if (pathname === '/artists') {
            searchContext = 'artists';
        }
    }


    if (trimmedSearchTerm.length >= 2) {
      const currentSearchQuery = searchParams.get('q');
      const currentSearchContext = searchParams.get('context');
      
      if (pathname !== '/search' || currentSearchQuery !== trimmedSearchTerm || (searchContext && currentSearchContext !== searchContext)) {
        let queryString = `q=${encodeURIComponent(trimmedSearchTerm)}`;
        if (searchContext) {
            queryString += `&context=${searchContext}`;
        }
        router.push(`/search?${queryString}`);
      }
    } else if (trimmedSearchTerm.length === 0 && pathname === '/search' && !isHomePage) {
      router.push('/artworks'); 
    }
   }, [debouncedSearchTerm, router, pathname, searchParams, isHomePage]);


   const handleClearSearch = () => {
     setSearchTerm('');
     if (isMobileSearchVisible && mobileSearchInputRef.current) {
        mobileSearchInputRef.current.focus();
     } else if (desktopSearchInputRef.current) {
        desktopSearchInputRef.current.focus();
     }
     if (pathname === '/search') {
       router.push('/artworks');
     }
   };


   const isInAdminSection = pathname.startsWith('/admin');
   
   const isArtworkDetailPage = pathname.startsWith('/artworks/') && pathname.length > '/artworks/'.length && pathname !== '/artworks';
   const isArtistDetailPage = pathname.startsWith('/artists/') && pathname.length > '/artists/'.length && pathname !== '/artists';
   const isPublicDetailPage = isArtworkDetailPage || isArtistDetailPage;

   const showPublicNavItems = !isInAdminSection && !(isAdmin && isPublicDetailPage);


   const publicNavLinks = [
     { href: "/artworks", label: "Artwork" },
     { href: "/artists", label: "Artists" },
   ];
   
    useEffect(() => {
        if (isMobileSearchVisible && mobileSearchInputRef.current) {
            mobileSearchInputRef.current.focus();
        }
    }, [isMobileSearchVisible]);
    
    useEffect(() => {
        if(isMobileSearchVisible && pathname !== '/search' && isHomePage){
            setIsMobileSearchVisible(false);
        }
    },[pathname, isMobileSearchVisible, isHomePage]);

  return (
    <nav className="bg-card/80 border-b border-border/70 sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={isAdmin && isInAdminSection ? "/admin" : "/"} className="text-xl font-bold font-serif text-primary shrink-0">
          Artistry Haven {isInAdminSection && isAdmin && <span className="text-sm font-normal text-muted-foreground">- Admin</span>}
        </Link>

        {!isHomePage && !isInAdminSection && (
            <div className="hidden md:flex flex-grow justify-center px-4">
                <div className="relative w-full max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                    ref={desktopSearchInputRef}
                    type="search"
                    placeholder="Search artwork, artists..."
                    className="w-full pl-10 pr-10 rounded-md bg-background/70 focus:bg-background" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={handleClearSearch}
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        )}


        {showPublicNavItems && (
          <div className="hidden md:flex items-center space-x-6">
            {publicNavLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                </Link>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-1 sm:space-x-2">
          {showPublicNavItems && !isMobileSearchVisible && (
            <>
              <Link href="/cart" aria-label="View Cart">
                 <Button variant="ghost" size="icon" className="relative rounded-full">
                    <ShoppingCart className="h-5 w-5" />
                    {isAuthenticated && itemCount > 0 && (
                       <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-xs rounded-full">
                          {itemCount > 9 ? '9+' : itemCount}
                       </Badge>
                    )}
                 </Button>
              </Link>
              {isAuthenticated && !isAdmin && <NotificationBell />}
            </>
          )}

          {isLoading ? (
             <Button variant="ghost" size="sm" disabled className="rounded-md">Loading...</Button>
          ) : isAuthenticated ? (
             <>
              {isAdmin && !isInAdminSection && (
                 <Link href="/admin" title="Admin Dashboard">
                   <Button variant="ghost" size="icon" className="rounded-full"><UserCog className="h-5 w-5" /></Button>
                 </Link>
              )}
              {showPublicNavItems && (
                <Link href="/orders">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex rounded-md">My Orders</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex rounded-md">Logout</Button>
             </>
          ) : (
             <>
             <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-md">Login</Button>
             </Link>
             <Link href="/signup">
                <Button size="sm" className="rounded-md shadow hover:shadow-md">Sign Up</Button>
             </Link>
             </>
          )}
        
          <div className="md:hidden">
            {!isHomePage && !isInAdminSection && (
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsMobileSearchVisible(!isMobileSearchVisible)} aria-label="Toggle search">
                    {isMobileSearchVisible ? <X className="h-5 w-5" /> : <SearchIcon className="h-5 w-5"/>}
                </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 bg-card/95 backdrop-blur-md">
                <div className="p-4">
                    <SheetClose asChild>
                        <Link href={isAdmin && isInAdminSection ? "/admin" : "/"} className="text-lg font-bold font-serif text-primary mb-4 block">
                        Artistry Haven
                        </Link>
                    </SheetClose>
                    <Separator className="my-3"/>
                    
                    {isInAdminSection && isAdmin ? (
                        <>
                            <SheetClose asChild><Link href="/admin" className="block py-2 text-sm text-foreground hover:text-primary">Dashboard</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/artworks" className="block py-2 text-sm text-foreground hover:text-primary">Manage Artworks</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/artists" className="block py-2 text-sm text-foreground hover:text-primary">Manage Artists</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/orders" className="block py-2 text-sm text-foreground hover:text-primary">Manage Orders</Link></SheetClose>
                            <SheetClose asChild><Link href="/admin/delivery-options" className="block py-2 text-sm text-foreground hover:text-primary">Delivery Options</Link></SheetClose>
                             <SheetClose asChild><Link href="/admin/notifications" className="block py-2 text-sm text-foreground hover:text-primary">Notifications</Link></SheetClose>
                            <Separator className="my-3"/>
                            <SheetClose asChild><Link href="/" className="block py-2 text-sm text-foreground hover:text-primary">Back to Site</Link></SheetClose>
                        </>
                    ) : (
                        <>
                            {showPublicNavItems && publicNavLinks.map(link => (
                                <SheetClose asChild key={link.href}><Link href={link.href} className="block py-2 text-sm text-foreground hover:text-primary">{link.label}</Link></SheetClose>
                            ))}
                            {isAuthenticated && showPublicNavItems && (
                                <SheetClose asChild><Link href="/orders" className="block py-2 text-sm text-foreground hover:text-primary">My Orders</Link></SheetClose>
                            )}
                        </>
                    )}
                    <Separator className="my-3"/>
                    {isAuthenticated ? (
                        <SheetClose asChild><Button variant="outline" size="sm" onClick={logout} className="w-full rounded-md">Logout</Button></SheetClose>
                    ) : (
                        <div className="space-y-2">
                           <SheetClose asChild><Link href="/login" className="w-full block"><Button variant="ghost" className="w-full rounded-md">Login</Button></Link></SheetClose>
                           <SheetClose asChild><Link href="/signup" className="w-full block"><Button className="w-full rounded-md">Sign Up</Button></Link></SheetClose>
                        </div>
                    )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {!isHomePage && !isInAdminSection && isMobileSearchVisible && (
        <div className="md:hidden p-2 border-b border-border/70 bg-card">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                ref={mobileSearchInputRef}
                type="search"
                placeholder="Search artwork, artists..."
                className="w-full pl-10 pr-10 rounded-md bg-background/70 focus:bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={handleClearSearch}
                        aria-label="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
      )}
    </nav>
  );
}