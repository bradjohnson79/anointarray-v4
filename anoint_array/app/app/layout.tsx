
import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import FloatingCartButton from '@/components/floating-cart-button';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ANOINT Array - Sacred Healing Technology',
  description: 'Experience transcendental healing through scalar-enhanced products, sacred geometry, and bio-frequency technology. Unlock your natural healing potential with ANOINT Array.',
  keywords: 'scalar healing, sacred geometry, healing frequencies, metaphysical products, energy healing, chakra balancing, manifestation tools',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {/* GoAffPro loader (affiliates) */}
            <Script src="https://api.goaffpro.com/loader.js?shop=ihmumhbevz" strategy="afterInteractive" />
            {children}
            <FloatingCartButton />
            <Toaster position="bottom-left" />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
