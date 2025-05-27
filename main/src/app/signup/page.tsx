'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, UserPlus, Sparkles } from 'lucide-react';

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


const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional().or(z.literal("")),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  address: z.string().optional().or(z.literal("")),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      address: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      await signup(data);
      toast.success("Signup successful! Welcome!", {
        description: "You can now log in with your new account.",
      });
      router.push('/login');
    } catch (error: any) {
        console.error("Signup failed:", error);
        const errorMessage = (error as ApiErrorResponse)?.message || "An error occurred during signup.";
        toast.error(errorMessage, {
          description: "Please check the details and try again.",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay:0.1 } },
  };


  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 relative isolate overflow-hidden
                   bg-gradient-to-br from-sky-400/10 via-cyan-500/10 to-emerald-600/10
                   dark:from-sky-700/10 dark:via-cyan-800/10 dark:to-emerald-900/10">
      <FloatingBlob
        className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] top-[-25%] left-[-35%] opacity-30 md:opacity-40"
        gradientClass="bg-gradient-to-br from-teal-300 to-sky-400"
        animateProps={{ x: [0, -70, 50, 0], y: [0, 60, -80, 0], scale: [1, 0.8, 1.2, 1], rotate: [0, -20, 30, 0] }}
      />
      <FloatingBlob
        className="w-[500px] h-[500px] md:w-[700px] md:h-[700px] bottom-[-30%] right-[-30%] opacity-30 md:opacity-40"
        gradientClass="bg-gradient-to-tr from-violet-400 to-purple-500"
        animateProps={{ x: [0, 90, -60, 0], y: [0, -70, 50, 0], scale: [1, 1.2, 0.85, 1], rotate: [0, 40, -20, 0] }}
        transitionProps={{ duration: 30 }}
      />
       <FloatingBlob
          className="hidden lg:block w-[350px] h-[350px] top-[5%] right-[15%] opacity-20 md:opacity-30"
          gradientClass="bg-gradient-to-tl from-lime-300 to-green-400"
          animateProps={{ x: [0, 40, -50, 0], y: [0, -60, 40, 0], scale: [1, 0.9, 1.1, 1] }}
          transitionProps={{ duration: 25 }}
        />

      <motion.div variants={cardVariants} initial="hidden" animate="visible" className="w-full">
        <Card className="w-full max-w-lg mx-auto shadow-2xl 
                       bg-card/85 dark:bg-neutral-800/80 backdrop-blur-lg 
                       border-transparent hover:border-sky-500/20 dark:hover:border-sky-400/20 
                       transition-colors duration-300 rounded-xl">
          <CardHeader className="text-center pt-8">
             <div className="inline-block p-3 mb-4 bg-gradient-to-br from-sky-400/20 to-cyan-500/20 dark:from-sky-500/30 dark:to-cyan-600/30 rounded-full mx-auto">
                <UserPlus className="h-10 w-10 text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-600
                                  dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-500" />
            </div>
            <CardTitle className="text-3xl font-serif tracking-tight
                                text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-600
                                dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-500">
                Create Your Account
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-neutral-400 pt-1">
                Join Artistry Haven and start exploring.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8 md:px-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground dark:text-neutral-300">Name <span className="text-xs">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="Your Name" 
                            {...field} 
                            className="bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 border-border/70 dark:border-neutral-600/80 rounded-md py-5 px-4 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            className="bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 border-border/70 dark:border-neutral-600/80 rounded-md py-5 px-4 text-base"
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
                            placeholder="•••••••• (min. 8 characters)" 
                            {...field} 
                            className="bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 border-border/70 dark:border-neutral-600/80 rounded-md py-5 px-4 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground dark:text-neutral-300">Address <span className="text-xs">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="123 Art Street, Creative City" 
                            {...field} 
                            className="bg-background/70 dark:bg-neutral-700/50 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 border-border/70 dark:border-neutral-600/80 rounded-md py-5 px-4 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                    type="submit" 
                    className="w-full text-base font-semibold py-6 rounded-md shadow-lg hover:shadow-cyan-500/40
                               bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 hover:from-sky-600 hover:via-cyan-600 hover:to-emerald-600
                               text-white transition-all duration-300 ease-out transform hover:scale-105 active:scale-95" 
                    disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...</> : <><Sparkles className="mr-2 h-5 w-5"/> Sign Up & Explore</>}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="text-sm text-center block pb-8 text-muted-foreground dark:text-neutral-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 underline transition-colors">
              Log in instead
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}