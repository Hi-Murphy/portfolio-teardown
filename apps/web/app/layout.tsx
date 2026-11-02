import type * as React from 'react';

import { motionCss } from 'xploder/motion';
import { paletteCss } from 'xploder/theme';

import { SITE } from '../content/site';
import './globals.css';
import { THEME_SCRIPT } from './theme-script';

export const metadata = {
  title: {
    default: SITE.meta.title,
    template: '%s · ' + SITE.meta.siteName,
  },
  description: SITE.meta.description,
};

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
