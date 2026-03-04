import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(self), accelerometer=(self), gyroscope=(self)",
        },
      ],
    },
  ],

  // development proxy: browser uses HTTPS, Next proxies to HTTP backend
  // only intercept the external API namespace so local handlers under /api stay
  async rewrites() {
    const fastApiBase = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";
    
    return [
      {
        // external service lives under /api/v1 on the client
        source: "/api/v1/:path*",
        // forward to FastAPI running on plain HTTP
        destination: `${fastApiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;