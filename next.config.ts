import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Catalog upload allows up to 10 MB images; the form + multipart
      // framing adds a small overhead, so give a bit of headroom.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
