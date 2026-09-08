import { type Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/contexts/AppContext'
import { ClerkApiConfig } from '@/lib/api/clerk-config'
import { OrganizationProvider } from '@/components/providers/organization-provider'
import {
  getServerCompany,
  getServerProjects,
  getServerTeam,
  getServerMachinery,
  getServerDashboardSummary,
} from '@/lib/api/server'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Grupo Zenit - Gestión de Proyectos',
  description: 'Gestión de reportes diarios para proyectos de instalación solar',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Grupo Zenit',
    statusBarStyle: 'black-translucent',
    startupImage: '/icons/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1f24' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Cargar datos iniciales del servidor en paralelo
  // Si hay error o no hay autenticación, simplemente devolvemos null y el cliente los cargará
  const [company, projects, team, machinery, dashboardSummary] = await Promise.all([
    getServerCompany().catch(() => null),
    getServerProjects().catch(() => []),
    getServerTeam().catch(() => []),
    getServerMachinery().catch(() => []),
    getServerDashboardSummary().catch(() => null),
  ])

  return (
    <ClerkProvider
      localization={esES}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#d68f2d',
          borderRadius: '0',
        },
        elements: {
          card: {
            borderRadius: '0',
          },
          formButtonPrimary: {
            borderRadius: '0',
            backgroundColor: '#d68f2d',
            // El naranja es claro: en blanco el texto queda en 2.7:1. Con este
            // marron oscuro sube a 7:1 y el boton se sigue leyendo.
            color: '#23190f',
            '&:hover': {
              backgroundColor: '#bc7600',
              color: '#ffffff',
            },
            '&:focus': {
              boxShadow: '0 0 0 3px rgba(214, 143, 45, 0.25)',
            },
          },
          socialButtonsBlockButton: {
            borderRadius: '0',
          },
          formFieldInput: {
            borderRadius: '0',
          },
          footerActionLink: {
            color: '#d68f2d',
            '&:hover': {
              color: '#bc7600',
            },
          },
        },
      }}
      domain={undefined}
    >
      <html lang="es">
        <head>
          {/* Script para calcular altura real del viewport en móviles */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function setViewportHeight() {
                    const vh = window.innerHeight;
                    document.documentElement.style.setProperty('--viewport-height', vh + 'px');
                  }

                  setViewportHeight();

                  // Actualizar cuando cambie el tamaño (cuando aparece/desaparece barra del navegador)
                  let resizeTimer;
                  window.addEventListener('resize', function() {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(setViewportHeight, 100);
                  });
                })();
              `,
            }}
          />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <OrganizationProvider>
            <ClerkApiConfig>
              <AppProvider
                initialData={{
                  company,
                  projects,
                  team,
                  machinery,
                  dashboardSummary,
                }}
              >
                {children}
              </AppProvider>
            </ClerkApiConfig>
          </OrganizationProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
