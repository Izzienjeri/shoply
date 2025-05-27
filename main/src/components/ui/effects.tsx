'use client';

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from 'react';

const FloatingBlob = ({ className, animateProps, transitionProps, gradientClass }: {
  className?: string;
  animateProps: any;
  transitionProps?: any;
  gradientClass: string;
}) => (
  <motion.div
    className={cn(
      "absolute rounded-full opacity-30 md:opacity-40 mix-blend-multiply dark:mix-blend-screen filter blur-3xl -z-10",
      gradientClass,
      className
    )}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ ...animateProps, opacity: [0.1, 0.4, 0.2, 0.4, 0.1] }}
    transition={{
      duration: 25 + Math.random() * 20,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
      ...transitionProps,
    }}
  />
);

export { FloatingBlob };