import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true, // Add this line
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Recommended when allowing SVGs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  /* other config options here */
};

export default nextConfig;