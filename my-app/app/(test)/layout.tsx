import type { Metadata } from 'next';
import '../../app/globals.css';
import { Toaster } from '@/components/ui/sonner';
import Providers from '../(main)/providers';

export const metadata: Metadata = {
  title: 'Assessment | CodeArena',
  description: 'Complete your CodeArena assessment.',
};

export default function TestRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
