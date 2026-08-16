import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',   value: 'on' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Supabase API + Realtime
      `connect-src 'self' ${process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''} wss://*.supabase.co https://*.supabase.co ${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}`,
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js HMR requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      // Supabase Storage images
      `img-src 'self' data: blob: https://*.supabase.co`,
      "font-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // Local Supabase dev (supabase start)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/api/:path*`,
      },
    ]
  },

  // Reduce bundle size — suppress source maps in prod
  productionBrowserSourceMaps: false,
}

export default withNextIntl(nextConfig)
