import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // La importación de Excel/CSV sube el archivo por una Server Action (máx. 5 MB + overhead).
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
