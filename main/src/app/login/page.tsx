'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, LogInIcon, Sparkles } from 'lucide-react';

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
import { motion } from 'framer-motion';
import { FloatingBlob } from '@/components/ui/effects'; 
import { cn } from '@/lib/utils';


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
        toast.error(errorMessage, {
          description: "Please check your credentials and try again.",
        });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay:0.1 } },
  };

  if (isAuthLoading || (!isAuthLoading && isAuthenticated)) { 
      return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-rose-400/10 via-fuchsia-500/10 to-indigo-600/10">
            <Loader2 className="h-16 w-16 animate-spin text-pink-500"/>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 relative isolate overflow-hidden
                   bg-gradient-to-br from-rose-400/10 via-fuchsia-500/10 to-indigo-600/10
                   dark:from-rose-700/10 dark:via-fuchsia-800/10 dark:to-indigo-900/10">
      <FloatingBlob
        className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] top-[-20%] left-[-30%] opacity-30 md:opacity-40"
        gradientClass="bg-gradient-to-br from-pink-500 to-orange-400"
        animateProps={{ x: [0, 80, -50, 0], y: [0, -60, 90, 0], scale: [1, 1.2, 0.8, 1], rotate: [0, 30, -10, 0] }}
      />
      <FloatingBlob
        className="w-[450px] h-[450px] md:w-[650px] md:h-[650px] bottom-[-25%] right-[-25%] opacity-30 md:opacity-40"
        gradientClass="bg-gradient-to-tr from-cyan-400 to-lime-300"
        animateProps={{ x: [0, -90, 60, 0], y: [0, 70, -50, 0], scale: [1, 0.85, 1.2, 1], rotate: [0, -40, 20, 0] }}
        transitionProps={{ duration: 30 }}
      />
      <FloatingBlob
          className="hidden lg:block w-[300px] h-[300px] top-[10%] right-[25%] opacity-20 md:opacity-30"
          gradientClass="bg-gradient-to-tl from-yellow-300 to-red-400"
          animateProps={{ x: [0, 50, -40, 0], y: [0, -40, 60, 0], scale: [1, 1.15, 0.9, 1] }}
          transitionProps={{ duration: 25 }}
        />

      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="w-full">
        <Card className="w-full max-w-lg mx-auto shadow-2xl 
                       bg-card/85 dark:bg-neutral-800/80 backdrop-blur-lg 
                       border-transparent hover:border-pink-500/20 dark:hover:border-pink-400/20 
                       transition-colors duration-300 rounded-xl">
          <CardHeader className="text-center pt-8">
            <div className="inline-block p-3 mb-4 bg-gradient-to-br from-rose-400/20 to-fuchsia-500/20 dark:from-rose-500/30 dark:to-fuchsia-600/30 rounded-full mx-auto">
                <LogInIcon className="h-10 w-10 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600
                                  dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500" />
            </div>
            <CardTitle className="text-3xl font-serif tracking-tight 
                                text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600
                                dark:from-rose-400 dark:via-fuchsia-400 dark:to-purple-500">
                Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-neutral-400 pt-1">
                Access your Artistry Haven account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8 md:px-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground dark:text-neutral-300">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                            type="email" 
                            placeholder="you@example.com" 
                            {...field} 
                            className="bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 border-border/70 dark:border-neutral-600/80 rounded-md py-5 px-4 text-base"
                        />
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
                      <FormLabel className="text-muted-foreground dark:text-neutral-300">Password</FormLabel>
                      <FormControl>
                        <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 border-border/70 dark:border-neutral-600/80 rounded-md py-5 px-4 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                    type="submit" 
                    className="w-full text-base font-semibold py-6 rounded-md shadow-lg hover:shadow-pink-500/40
                               bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600
                               text-white transition-all duration-300 ease-out transform hover:scale-105 active:scale-95" 
                    disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Logging In...</> : <> <Sparkles className="mr-2 h-5 w-5"/> Login to Your Portal</>}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="text-sm text-center block pb-8 text-muted-foreground dark:text-neutral-400">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300 underline transition-colors">
              Sign up here
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}