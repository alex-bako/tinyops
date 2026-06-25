import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@workspace/ui"],
  // Pin the monorepo root so Turbopack doesn't misinfer it. Under `vercel build`
  // it otherwise picks `apps/web/app` and fails to resolve the hoisted `next/`
  // package. https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  experimental: {
    // Enables React's <ViewTransition> for client-side route crossfades.
    viewTransition: true,
  },
}

export default nextConfig
