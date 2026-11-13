import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  async redirects(){if(process.env.NEXT_PUBLIC_SHARED_PREVIEW==="1")return [{source:"/new",destination:"/",permanent:false}];return process.env.NEXT_PUBLIC_SHOWCASE_ONLY === "1" ? [{source:"/new",destination:"/",permanent:false},{source:"/deck/:path*",destination:"/",permanent:false}] : [];},
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  reactStrictMode: false,
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource: { request: string }) => {
            resource.request = resource.request.replace(/^node:/, "");
          },
        ),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};
export default config;
