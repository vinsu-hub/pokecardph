import type { NextConfig } from "next";

// Derived from the env var rather than hardcoded, so switching Supabase
// projects doesn't need a code change here too. Only the public storage path
// is allowlisted — vendor-uploaded listing photos, shop assets, and the
// public scan-maps bucket all live under it; the two private buckets
// (scan-raw, message-attachments) aren't served through next/image anyway.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
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
