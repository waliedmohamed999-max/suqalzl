import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // SSE must not be gzip-buffered (SPEC §2 Realtime, P1-00).
  compress: false,
  poweredByHeader: false,
  // M1-04 owner preview runs `next dev` and is opened from a phone on the same Wi-Fi by the Mac's
  // LAN IP: allow private-network origins for dev assets/HMR (dev server only; no effect on builds).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  reactStrictMode: true,
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "nodemailer"],
  typescript: { ignoreBuildErrors: false },
  // D30 (P1-02): *.dev.tsx routes (the /dev/components catalogue with Zod-generated sample data)
  // exist only outside production builds.
  pageExtensions: process.env.NODE_ENV === "production" ? ["tsx", "ts"] : ["tsx", "ts", "dev.tsx"],
  // `npm run lint` is a separate CI job (flat config); don't run the legacy lint inside next build.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
