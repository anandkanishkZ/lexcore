import type { NextConfig } from "next";

/**
 * next/image refuses any remote host not listed here, so the API origin that
 * actually serves `/uploads/**` (profile photos) has to be derived from the
 * same env var the app fetches from — hardcoding only localhost meant every
 * avatar 400'd in production, where the API lives on its own domain.
 */
function uploadsPattern() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    try {
        const { protocol, hostname, port } = new URL(apiUrl);
        return [
            {
                protocol: protocol.replace(":", "") as "http" | "https",
                hostname,
                // An empty string is what next/image expects for "default port
                // for this protocol" — `undefined` would mean "any port".
                port,
                pathname: "/uploads/**",
            },
        ];
    } catch {
        // A malformed NEXT_PUBLIC_API_URL shouldn't take the whole build down;
        // avatars degrade to the initials fallback instead.
        return [];
    }
}

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: "localhost",
                port: "8089",
                pathname: "/uploads/**",
            },
            ...uploadsPattern(),
        ],
    },
};

export default nextConfig;
