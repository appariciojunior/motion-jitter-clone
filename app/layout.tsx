import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/tokens.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Motion Studio',
  description: 'Motion Studio — an open-source factory for quick videos and GIFs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
