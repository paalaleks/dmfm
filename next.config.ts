import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['i.scdn.co', 'res.cloudinary.com'], // Add other domains if needed
  },
  // reactStrictMode: false, // Temporarily disable for diagnosis
};

export default nextConfig;
