import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: false,
  // Página que sirve el SW cuando el usuario está offline y no hay cache para la ruta
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Cachear las páginas HTML de la app para disponibilidad offline
        urlPattern: /^https?:\/\/[^/]+\/(tablero|reporte|avances|maquinaria|configuracion)(\/.*)?(\?.*)?$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "app-pages",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/static.+\.js$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-js-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image",
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
});

// Frontend API de la instancia de producción de Clerk.
// Clerk lo expone como clerk.<dominio de la app>; en desarrollo se usa *.clerk.accounts.dev.
const CLERK_FRONTEND_API = 'https://clerk.reportes.grupozenit.com';

// Clerk sirve el desafío de bot protection a través de Cloudflare Turnstile.
const TURNSTILE = 'https://challenges.cloudflare.com';

const nextConfig: NextConfig = {
  // Evita el error de conflicto Turbopack/webpack en Next.js 16.
  // El plugin PWA usa webpack, pero está deshabilitado en dev, así que
  // declarar turbopack vacío silencia la advertencia sin afectar nada.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**.railway.app',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev ${CLERK_FRONTEND_API} ${TURNSTILE}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http://localhost:8000",
              "font-src 'self' data:",
              `connect-src 'self' https://clerk.com https://*.clerk.accounts.dev https://clerk.accounts.dev ${CLERK_FRONTEND_API} https://clerk-telemetry.com http://localhost:8000 https://*.vercel.app https://*.railway.app`,
              `frame-src 'self' https://clerk.com https://*.clerk.accounts.dev ${CLERK_FRONTEND_API} ${TURNSTILE}`,
              "worker-src 'self' blob:",
            ].join('; ')
          },
        ],
      },
    ]
  },
};

export default withPWA(nextConfig);
