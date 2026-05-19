import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { AuthStateTracker } from '@/components/auth/auth-state-tracker';
import { CallProvider } from '@/components/calls/CallProvider';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gamma | Modern Messenger",
  description: "Connect with the universe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-300">
        <CallProvider>
          <AuthStateTracker />
          {children}
          <NotificationPermissionBanner />
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'glass text-foreground border-border',
              duration: 4000,
            }}
          />
        </CallProvider>
      </body>
    </html>
  );
}
