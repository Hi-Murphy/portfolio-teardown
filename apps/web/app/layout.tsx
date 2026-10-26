import type * as React from 'react';

import './globals.css';
import { THEME_SCRIPT } from './theme-script';

export const metadata = {
  title: 'Portfolio Teardown',
  description: 'Data-driven teardown portfolio — coming online slice by slice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-dvh bg-bg text-fg font-sans antialiased">{children}</body>
    </html>
  );
}
