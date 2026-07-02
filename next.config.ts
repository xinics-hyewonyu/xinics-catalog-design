import type { NextConfig } from "next";

const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Images no longer travel through Server Actions — the browser uploads
      // them straight to Supabase Storage via signed URLs (see
      // app/actions/signed-upload.ts), sidestepping Vercel's ~4.5 MB request
      // body limit. Actions now carry only small metadata payloads.
      bodySizeLimit: "1mb",
    },
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
