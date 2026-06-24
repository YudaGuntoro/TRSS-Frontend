import { Outfit } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  icons: {
    apple: "/images/logo/favicon.png",
    icon: "/images/logo/favicon.png",
    shortcut: "/images/logo/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
