"use client";

import { motion } from "framer-motion";
import React from "react";

const MotionMainWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.main
      className="flex-grow container mx-auto px-4 py-8 md:py-12"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {children}
    </motion.main>
  );
};

export default MotionMainWrapper;