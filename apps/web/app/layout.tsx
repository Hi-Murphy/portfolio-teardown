import type * as React from 'react';

export const metadata = {
  title: 'Portfolio Teardown',
  description: 'Data-driven teardown portfolio — coming online slice by slice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
