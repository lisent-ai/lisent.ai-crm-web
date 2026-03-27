import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  experimental: {
    webpackBuildWorker: false,
    // Reverse proxy (Dokploy/Traefik) doğru Host / URL için; aksi halde iç port/hostname kullanılabilir.
    trustHostHeader: true,
  },
};

export default nextConfig;
