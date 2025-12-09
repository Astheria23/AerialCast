import type { NextConfig } from "next";

const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

const supabaseHostname = supabaseBaseUrl ? new URL(supabaseBaseUrl).hostname : undefined;

const supabaseRemotePatterns = [
  ...(supabaseHostname
    ? [
        {
          protocol: "https",
          hostname: supabaseHostname,
          pathname: "/storage/v1/object/public/**",
        } as const,
      ]
    : []),
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  } as const,
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: supabaseRemotePatterns,
  },
};

export default nextConfig;
