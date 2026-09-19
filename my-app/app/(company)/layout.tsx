import type { Metadata } from 'next';
import '../../app/globals.css';
import { Toaster } from '@/components/ui/sonner';
import Providers from '../(main)/providers';

export const metadata: Metadata = {
  title: 'Company Portal | CodeArena',
  description: 'Manage company assessments and candidate test links.',
};

export default function CompanyRootLayout({ children }: { children: React.ReactNode }) {
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
