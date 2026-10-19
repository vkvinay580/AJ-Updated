import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@ffprobe-installer/ffprobe"],
  allowedDevOrigins: ["127.0.0.1", "192.168.1.71"],
  experimental: {
    useTypeScriptCli: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ] },
      { source: "/admin/:path*", headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" },
      ] },
      { source: "/api/admin/:path*", headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" },
      ] },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
