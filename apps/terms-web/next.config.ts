import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  trailingSlash: false,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/en", destination: "/overview", permanent: false },
      { source: "/en/:slug", destination: "/:slug", permanent: false },
      { source: "/nl-be", destination: "/overview", permanent: false },
      { source: "/nl-be/:slug", destination: "/overview", permanent: false },
      { source: "/fr-be", destination: "/overview", permanent: false },
      { source: "/fr-be/:slug", destination: "/overview", permanent: false },
    ];
  },
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
