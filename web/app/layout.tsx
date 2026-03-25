import type { Metadata } from 'next';
import { spaceGrotesk, jetbrainsMono } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'PaperToNotebook — Research Paper → Colab Notebook',
  description:
    'Upload a research paper PDF and get a publication-quality Google Colab notebook implementing its algorithms and methodology.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
