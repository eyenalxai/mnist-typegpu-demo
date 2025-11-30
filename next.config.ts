import type { NextConfig } from "next"
import { env } from "@/lib/env"

const extractDomain = (url: string) => {
	const urlObj = new URL(url)
	return urlObj.hostname
}

const nextConfig: NextConfig = {
	transpilePackages: ["geist"],
	allowedDevOrigins: [extractDomain(env.NEXT_PUBLIC_APP_URL)]
}

module.exports = nextConfig
