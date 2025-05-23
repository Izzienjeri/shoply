'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from '@/contexts/AuthContext';
import { ApiErrorResponse } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      const redirectPath = searchParams.get('redirect');
      if (isAdmin) {
        router.replace(redirectPath && redirectPath.startsWith('/admin') ? redirectPath : '/admin');
      } else {
        router.replace(redirectPath || '/');
      }
    }
  }, [isAuthenticated, isAuthLoading, isAdmin, router, searchParams]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (error: any) {
        console.error("Login failed:", error);
        const errorMessage = (error as ApiErrorResponse)?.message || "An error occurred during login.";
        toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || (!isAuthLoading && isAuthenticated)) { 
      return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>;
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Access your Artistry Haven account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-sm text-center block">
          Don't have an account?{" "}
          <Link href="/signup" className="underline hover:text-primary">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}