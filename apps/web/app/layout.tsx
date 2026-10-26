import type * as React from 'react';

import './globals.css';

export const metadata = {
  title: 'Portfolio Teardown',
  description: 'Data-driven teardown portfolio — coming online slice by slice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-fg font-sans antialiased">{children}</body>
    </html>
  );
}
