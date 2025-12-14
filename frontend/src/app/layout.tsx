import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: {
    default: 'PDF Editor Pro - Free Online PDF Editor',
    template: '%s | PDF Editor Pro',
  },
  description: 'Free online PDF editor with powerful features: edit, annotate, highlight, merge, compress, convert to Word/Excel/PowerPoint, add text, images, and more. No installation required.',
  keywords: [
    'PDF editor',
    'online PDF editor',
    'free PDF editor',
    'edit PDF online',
    'PDF annotator',
    'PDF converter',
    'PDF to Word',
    'PDF to Excel',
    'merge PDF',
    'compress PDF',
    'PDF tools',
    'highlight PDF',
    'add text to PDF',
    'sign PDF',
    'OCR PDF',
  ],
  authors: [{ name: 'PDF Editor Pro Team' }],
  creator: 'PDF Editor Pro',
  publisher: 'PDF Editor Pro',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'PDF Editor Pro - Free Online PDF Editor',
    description: 'Edit, annotate, convert, merge, and compress PDFs online for free. No installation required.',
    siteName: 'PDF Editor Pro',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PDF Editor Pro - Online PDF Editing Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF Editor Pro - Free Online PDF Editor',
    description: 'Edit, annotate, convert, merge, and compress PDFs online for free. No installation required.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
  category: 'Productivity',
  applicationName: 'PDF Editor Pro',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://pdf-editor-pro.replit.app'),
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || '',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'PDF Editor Pro',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'PDF Editor Pro',
    description: 'Free online PDF editor with powerful features: edit, annotate, highlight, merge, compress, convert to Word/Excel/PowerPoint, add text, images, and more.',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Edit PDF documents',
      'Add text and images',
      'Highlight and annotate',
      'Convert PDF to Word, Excel, PowerPoint',
      'Merge multiple PDFs',
      'Compress PDF files',
      'OCR text extraction',
      'Add password protection',
      'Redact sensitive information',
    ],
    browserRequirements: 'Requires JavaScript. Works best in Chrome, Firefox, Safari, Edge.',
    softwareVersion: '1.0.0',
    author: {
      '@type': 'Organization',
      name: 'PDF Editor Pro',
    },
  };

  return (
    <html lang="en">
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" async></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
