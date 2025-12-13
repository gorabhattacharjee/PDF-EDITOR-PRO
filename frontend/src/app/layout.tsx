﻿import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/Toaster';

export const metadata: Metadata = {
  title: 'PDF Editor Pro',
  description: 'Production-ready web-based PDF editor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Load PDF.js from CDN */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" async></script>
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
