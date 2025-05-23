'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/admin');
      } else if (!isAdmin) {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isAdmin, authIsLoading, router]);

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && isAdmin) {
    return <>{children}</>;
  }

  return null; 
}