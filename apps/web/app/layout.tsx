import type * as React from 'react';

import { motionCss } from 'xploder/motion';
import { paletteCss } from 'xploder/theme';

import { baseMetadata, SITE_VIEWPORT } from '../seo/metadata';
import './globals.css';
import { THEME_SCRIPT } from './theme-script';

export const metadata = baseMetadata();
export const viewport = SITE_VIEWPORT;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: paletteCss() + motionCss() }} />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-dvh bg-bg text-fg font-sans antialiased">{children}</body>
    </html>
  );
}
