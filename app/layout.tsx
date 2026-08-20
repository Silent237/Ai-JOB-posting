import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'AI Job Application & Resume Dashboard',
  description: 'Tailor LaTeX resumes, audit against JDs, and manage daily job applications.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
