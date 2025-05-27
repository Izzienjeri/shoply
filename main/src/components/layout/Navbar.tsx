'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, UserCog, LogOutIcon, Menu, Search as SearchIcon, X, Sparkles, LogIn, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from '../ui/separator';
import React, { useState, useEffect, useRef } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
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
   const [isScrolled, setIsScrolled] = useState(false);

   useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    if (isHomePage) {
      window.addEventListener('scroll', handleScroll);
      handleScroll();
    } else {
      setIsScrolled(true);
    }
    return () => {
      if (isHomePage) {
        window.removeEventListener('scroll', handleScroll);
      }
    };
   }, [isHomePage]);

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
        if (pathname === '/artworks') searchContext = 'artworks';
        else if (pathname === '/artists') searchContext = 'artists';
    }

    if (trimmedSearchTerm.length >= 2) {
      const currentSearchQuery = searchParams.get('q');
      const currentSearchContext = searchParams.get('context');
      if (pathname !== '/search' || currentSearchQuery !== trimmedSearchTerm || (searchContext && currentSearchContext !== searchContext)) {
        let queryString = `q=${encodeURIComponent(trimmedSearchTerm)}`;
        if (searchContext) queryString += `&context=${searchContext}`;
        router.push(`/search?${queryString}`);
      }
    } else if (trimmedSearchTerm.length === 0 && pathname === '/search' && !isHomePage) {
      router.push(searchContext ? `/${searchContext}` : '/artworks');
    }
   }, [debouncedSearchTerm, router, pathname, searchParams, isHomePage]);

   const handleClearSearch = () => {
     setSearchTerm('');
     const inputRef = isMobileSearchVisible ? mobileSearchInputRef.current : desktopSearchInputRef.current;
     if (inputRef) inputRef.focus();
     if (pathname === '/search') router.push('/artworks');
   };

   const isInAdminSection = pathname.startsWith('/admin');
   const isAuthPage = pathname === '/login' || pathname === '/signup';
   const isPublicDetailPage = (pathname.startsWith('/artworks/') || pathname.startsWith('/artists/')) &&
                              (pathname.length > '/artworks/'.length || pathname.length > '/artists/'.length) &&
                              pathname !== '/artworks' && pathname !== '/artists';

   const showPublicNavItems = !isInAdminSection && !isAuthPage && !(isAdmin && isPublicDetailPage);
   const showSearchInDesktopNav = !isHomePage && !isInAdminSection && !isAuthPage;
   const showSearchInMobileNavToggle = !isHomePage && !isInAdminSection && !isAuthPage;

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
        if(isMobileSearchVisible && (isHomePage || isAuthPage)){
            setIsMobileSearchVisible(false);
        }
    },[pathname, isMobileSearchVisible, isHomePage, isAuthPage]);

  const navBaseClasses = "sticky top-0 z-50 transition-all duration-300 ease-in-out";
  const navScrolledOrNotHomeClasses = "bg-card/90 dark:bg-neutral-900/85 backdrop-blur-lg border-b border-border/60 dark:border-neutral-700/60 shadow-lg";

  const navHomePageTopClasses = "bg-black/5 dark:bg-black/10 backdrop-blur-sm border-transparent";

  const textColorScrolledOrNotHome = "text-muted-foreground dark:text-neutral-300";
  const hoverTextColorScrolledOrNotHome = "hover:text-pink-500 dark:hover:text-pink-400";
  const activeTextColorScrolledOrNotHome = "text-pink-600 dark:text-pink-400 font-semibold";
  const iconColorScrolledOrNotHome = "text-muted-foreground dark:text-neutral-300 group-hover:text-pink-500 dark:group-hover:text-pink-400";
  const logoColorScrolledOrNotHome = "text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500";
  const logoIconColorScrolledOrNotHome = "text-pink-500 dark:text-pink-400";

  const highContrastPurple = "text-purple-600 dark:text-purple-400";
  const highContrastPink = "text-pink-600 dark:text-pink-400";
  const highContrastFuchsia = "text-fuchsia-600 dark:text-fuchsia-400";
  const highContrastMuted = "text-purple-700/80 dark:text-purple-300/80";

  const textColorHomePageTop = `${highContrastMuted} hover:${highContrastPink}`;
  const activeTextColorHomePageTop = `${highContrastPink} font-semibold underline decoration-purple-500 underline-offset-4`;
  const iconColorHomePageTop = `${highContrastPurple} group-hover:${highContrastPink}`;
  const logoColorHomePageTop = `${highContrastFuchsia} drop-shadow-sm`;
  const logoIconColorHomePageTop = `${highContrastPink} drop-shadow-sm`;


  return (
    <nav className={cn(navBaseClasses, (isHomePage && !isScrolled) ? navHomePageTopClasses : navScrolledOrNotHomeClasses)}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link
            href={isAdmin && isInAdminSection ? "/admin" : "/"}
            className={cn(
                "text-xl md:text-2xl font-bold font-serif shrink-0 transition-colors duration-300 flex items-center",
                (isHomePage && !isScrolled) ? logoColorHomePageTop : logoColorScrolledOrNotHome
            )}
        >
          <Palette className={cn("mr-2 h-6 w-6 md:h-7 md:w-7 transition-colors duration-300", (isHomePage && !isScrolled) ? logoIconColorHomePageTop : logoIconColorScrolledOrNotHome)} />
          Artistry Haven
          {isInAdminSection && isAdmin && <span className={cn("text-sm font-normal ml-1.5", (isHomePage && !isScrolled) ? "text-purple-700/70 dark:text-purple-300/70" : "text-muted-foreground")}> - Admin</span>}
        </Link>

        {showSearchInDesktopNav && (
            <div className="hidden md:flex flex-grow justify-center max-w-md">
                 <div className="relative w-full">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-neutral-400 pointer-events-none" />
                    <Input
                        ref={desktopSearchInputRef} type="search" placeholder="Search..."
                        className="w-full pl-10 pr-10 rounded-full bg-background/70 dark:bg-neutral-800/60 border-border/70 dark:border-neutral-700/80 focus:bg-background dark:focus:bg-neutral-800 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 placeholder:text-muted-foreground/70 dark:placeholder:text-neutral-500 text-sm py-2 h-9"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && (<Button type="button" variant="ghost" size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-pink-500 dark:hover:text-pink-400 rounded-full" onClick={handleClearSearch} aria-label="Clear search"><X className="h-4 w-4" /></Button>)}
                </div>
            </div>
        )}

        {showPublicNavItems && (
          <div className="hidden md:flex items-center space-x-6">
            {publicNavLinks.map(link => (
                <Link key={link.href} href={link.href}
                    className={cn(
                        "text-base font-medium transition-colors duration-300",
                        (isHomePage && !isScrolled) ? textColorHomePageTop : textColorScrolledOrNotHome,
                        pathname === link.href && ((isHomePage && !isScrolled) ? activeTextColorHomePageTop : activeTextColorScrolledOrNotHome)
                    )}>{link.label}</Link>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-1 sm:space-x-2">
          {showPublicNavItems && !isMobileSearchVisible && (
            <>
              <Link href="/cart" aria-label="View Cart">
                 <Button variant="ghost" size="icon"
                    className={cn("relative rounded-full transition-colors duration-300 group", (isHomePage && !isScrolled) ? `hover:bg-purple-500/10` : "hover:bg-primary/10 dark:hover:bg-neutral-700/60")}
                  ><ShoppingCart className={cn("h-5 w-5", (isHomePage && !isScrolled) ? iconColorHomePageTop : iconColorScrolledOrNotHome)} />
                    {isAuthenticated && itemCount > 0 && (
                       <Badge className={cn("absolute -top-1 -right-1 h-4.5 w-4.5 min-w-[1.125rem] p-0 flex items-center justify-center text-xs rounded-full bg-pink-500 text-white border-2 shadow",
                                           (isHomePage && !isScrolled) ? "border-black/10 dark:border-black/20" : "border-background dark:border-neutral-800")}>
                          {itemCount > 9 ? '9+' : itemCount}</Badge>
                    )}</Button></Link>
              {isAuthenticated && !isAdmin && <NotificationBell isHomePageTop={isHomePage && !isScrolled} />}
            </>
          )}

          {isLoading ? (
             <Button variant="ghost" size="sm" disabled className={cn("rounded-md", (isHomePage && !isScrolled) ? highContrastMuted : textColorScrolledOrNotHome )}>Loading...</Button>
          ) : isAuthenticated ? (
             <>
              {isAdmin && !isInAdminSection && (
                 <Link href="/admin" title="Admin Dashboard">
                   <Button variant="ghost" size="icon" className={cn("rounded-full group", (isHomePage && !isScrolled) ? `hover:bg-purple-500/10` : "hover:bg-primary/10")}><UserCog className={cn("h-5 w-5", (isHomePage && !isScrolled) ? iconColorHomePageTop : iconColorScrolledOrNotHome)} /></Button></Link>)}
              {showPublicNavItems && (<Link href="/orders"><Button variant="ghost" size="sm" className={cn("hidden sm:inline-flex rounded-md text-base", (isHomePage && !isScrolled) ? textColorHomePageTop : textColorScrolledOrNotHome + " " + hoverTextColorScrolledOrNotHome)}>My Orders</Button></Link>)}
              <Button variant="ghost" size="sm" onClick={logout}
                className={cn("hidden sm:inline-flex items-center rounded-md transition-colors duration-300 group text-base",
                    (isHomePage && !isScrolled)
                        ? `${highContrastMuted} hover:${highContrastPink} border border-purple-500/30 hover:border-purple-500/60 bg-transparent hover:bg-purple-500/5`
                        : `${textColorScrolledOrNotHome} hover:text-pink-500 dark:hover:text-pink-400 hover:bg-pink-500/10 dark:hover:bg-pink-400/10`
                )}><LogOutIcon className={cn("mr-1.5 h-4 w-4 transition-colors", (isHomePage && !isScrolled) ? highContrastPink : "text-pink-500/80 dark:text-pink-400/80 group-hover:text-pink-500 dark:group-hover:text-pink-400")} /> <span className="hidden md:inline">Logout</span></Button>
             </>
          ) : (
             <>
             <Link href="/login">
                <Button variant="outline" size="sm"
                    className={cn("rounded-md transition-colors duration-300 text-sm px-3 py-1.5 h-auto sm:px-4 sm:py-2 sm:h-9 group sm:text-base",
                        (isHomePage && !isScrolled)
                            ? `bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/50 hover:border-purple-600/70 text-purple-600 dark:text-purple-300 dark:border-purple-400/50 dark:hover:border-purple-400/70 dark:hover:bg-purple-400/20 shadow-sm hover:shadow-md`
                            : `${textColorScrolledOrNotHome} border-primary/70 hover:bg-primary/10 ${hoverTextColorScrolledOrNotHome}`
                    )}><LogIn className={cn("mr-1.5 h-4 w-4 transition-colors", (isHomePage && !isScrolled) ? highContrastPurple : "")}/> Login</Button></Link>
             <Link href="/signup">
                <Button size="sm"
                    className={cn("rounded-md shadow-md transition-all duration-300 ease-out transform hover:scale-[1.03] active:scale-95 text-sm px-3 py-1.5 h-auto sm:px-4 sm:py-2 sm:h-9 sm:text-base",
                        (isHomePage && !isScrolled)
                            ? "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white hover:shadow-lg"
                            : "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white hover:shadow-pink-500/30 dark:hover:shadow-pink-400/30"
                    )}><Sparkles className="mr-1.5 h-4 w-4"/> Sign Up</Button></Link>
             </>
          )}

          <div className="md:hidden">
            {showSearchInMobileNavToggle && (
                <Button variant="ghost" size="icon"
                    className={cn("rounded-full transition-colors duration-300 group", (isHomePage && !isScrolled) ? `hover:bg-purple-500/10` : "hover:bg-primary/10")}
                    onClick={() => setIsMobileSearchVisible(!isMobileSearchVisible)} aria-label="Toggle search"
                >{isMobileSearchVisible ? <X className={cn("h-5 w-5", (isHomePage && !isScrolled) ? iconColorHomePageTop : iconColorScrolledOrNotHome)} /> : <SearchIcon className={cn("h-5 w-5", (isHomePage && !isScrolled) ? iconColorHomePageTop : iconColorScrolledOrNotHome)}/>}</Button>)}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("rounded-full transition-colors duration-300 group", (isHomePage && !isScrolled) ? `hover:bg-purple-500/10` : "hover:bg-primary/10")} aria-label="Open menu"><Menu className={cn("h-5 w-5", (isHomePage && !isScrolled) ? iconColorHomePageTop : iconColorScrolledOrNotHome)} /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col p-0 bg-card/95 dark:bg-neutral-800/95 backdrop-blur-xl border-l border-border/60 dark:border-neutral-700/60">
                <SheetHeader className="p-5 pb-3 border-b border-border/50 dark:border-neutral-700/50">
                  <SheetTitle className="text-xl font-semibold font-serif text-primary">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Main navigation links and account options for Artistry Haven.
                  </SheetDescription>
                </SheetHeader>

                <div className="p-5 border-b border-border/50 dark:border-neutral-700/50">
                    <SheetClose asChild>
                        <Link href={isAdmin && isInAdminSection ? "/admin" : "/"} className="text-lg font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500 block">
                            <Palette className="inline-block mr-2 h-5 w-5 text-pink-500 dark:text-pink-400" />Artistry Haven
                        </Link>
                    </SheetClose>
                </div>

                <ScrollArea className="flex-grow">
                    <div className="p-5 space-y-1">
                        {isInAdminSection && isAdmin ? ( <></> ) : (
                            <>
                                {showPublicNavItems && publicNavLinks.map(link => (
                                    <SheetClose asChild key={link.href}><Link href={link.href} className={cn("block py-2.5 text-sm font-medium rounded-md px-3 hover:bg-pink-500/10 dark:hover:bg-pink-400/10 hover:text-pink-500 dark:hover:text-pink-400 transition-colors", pathname === link.href ? "text-pink-600 dark:text-pink-400 bg-pink-500/5 dark:bg-pink-400/5" : "text-foreground dark:text-neutral-200")}>{link.label}</Link></SheetClose>
                                ))}
                                {isAuthenticated && showPublicNavItems && (
                                    <SheetClose asChild><Link href="/orders" className={cn("block py-2.5 text-sm font-medium rounded-md px-3 hover:bg-pink-500/10 dark:hover:bg-pink-400/10 hover:text-pink-500 dark:hover:text-pink-400 transition-colors", pathname === "/orders" ? "text-pink-600 dark:text-pink-400 bg-pink-500/5 dark:bg-pink-400/5" : "text-foreground dark:text-neutral-200")}>My Orders</Link></SheetClose>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-5 border-t border-border/50 dark:border-neutral-700/50 mt-auto">
                  {isAuthenticated ? (
                      <SheetClose asChild><Button variant="outline" size="sm" onClick={logout} className="w-full rounded-md border-pink-500/80 text-pink-600 hover:bg-pink-500/10 dark:border-pink-400/80 dark:text-pink-400 dark:hover:bg-pink-400/10 focus-visible:ring-pink-500">Logout</Button></SheetClose>
                  ) : (
                      <div className="space-y-3">
                         <SheetClose asChild><Link href="/login" className="w-full block"><Button variant="outline" className="w-full rounded-md border-pink-500/80 text-pink-600 hover:bg-pink-500/10 dark:border-pink-400/80 dark:text-pink-400 dark:hover:bg-pink-400/10 focus-visible:ring-pink-500">Login</Button></Link></SheetClose>
                         <SheetClose asChild><Link href="/signup" className="w-full block"><Button className="w-full rounded-md bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white focus-visible:ring-pink-500"><Sparkles className="mr-2 h-4 w-4"/>Sign Up</Button></Link></SheetClose>
                      </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {showSearchInMobileNavToggle && isMobileSearchVisible && (
        <div className="md:hidden p-3 border-b border-border/60 dark:border-neutral-700/60 bg-card/95 dark:bg-neutral-800/95 shadow-sm">
             <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-neutral-400 pointer-events-none" />
                <Input ref={mobileSearchInputRef} type="search" placeholder="Search artwork, artists..."
                  className="w-full pl-10 pr-10 rounded-full bg-background/70 dark:bg-neutral-700/60 border-border/80 dark:border-neutral-600/80 focus:bg-background dark:focus:bg-neutral-700 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 placeholder:text-muted-foreground/70 dark:placeholder:text-neutral-500 text-sm py-2 h-9"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                {searchTerm && (<Button type="button" variant="ghost" size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-pink-500 dark:hover:text-pink-400 rounded-full"
                    onClick={handleClearSearch} aria-label="Clear search"><X className="h-4 w-4" /></Button>)}
            </div>
        </div>
      )}
    </nav>
  );
}