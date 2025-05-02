'use client'; // Needs to be a client component to use hooks later

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';


export function Navbar() {
   const { isAuthenticated, isLoading, logout, user } = useAuth();
   const { itemCount } = useCart();

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo/Brand Name */}
        <Link href="/" className="text-xl font-bold font-serif text-primary">
          Artistry Haven
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/products" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Artwork
          </Link>
          {/* Add other links like About, Contact if needed */}
        </div>

        {/* Actions: Auth & Cart */}
        <div className="flex items-center space-x-4">
          <Link href="/cart" aria-label="View Cart">
             <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {isAuthenticated && itemCount > 0 && (
                   <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-xs">
                      {itemCount}
                   </Badge>
                )}
             </Button>
          </Link>

          {isLoading ? (
             <Button variant="ghost" size="sm" disabled>Loading...</Button>
          ) : isAuthenticated ? (
             <>
              <Link href="/orders">
                <Button variant="ghost" size="sm">My Orders</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
              {/* Optional: Display user initial/name */}
              {/* <span className="text-sm text-muted-foreground hidden lg:block">{user?.email}</span> */}
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
        </div>
      </div>
    </nav>
  );
}