import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import MobileNav from '@/components/layout/MobileNav';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Entre Páginas — Biblioteca e Gamificação de Leitura',
  description: 'Descubra livros, gerencie sua biblioteca pessoal e ganhe XP acompanhando seu progresso de leitura.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Entre Páginas',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#722F37',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-[#FAF8F5] text-[#2C2224] flex flex-col selection:bg-[#E8B4B8]/30 selection:text-[#722F37]">
        {/* Header Superior Desktop e Mobile */}
        <Navbar />

        {/* Conteúdo Principal */}
        <main className="flex-1 pb-24 md:pb-12">
          {children}
        </main>

        {/* Barra de Navegação Inferior para Mobile (estilo iOS Dock) */}
        <MobileNav />
      </body>
    </html>
  );
}
