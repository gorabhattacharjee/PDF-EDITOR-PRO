import type { Metadata } from 'next';
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
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
