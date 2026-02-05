import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from '@/contexts/UserContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgiMate — Глаза, уши и руки для вашего AI-агента",
  description: "AgiMate подключает AI-агентов к вашим устройствам и сервисам. Скриншоты, уведомления из 100+ сервисов, выполнение команд — пусть AI не только говорит, но и действует.",
  openGraph: {
    title: "AgiMate — Глаза, уши и руки для вашего AI-агента",
    description: "AgiMate подключает AI-агентов к вашим устройствам и сервисам. Пусть AI не только говорит — пусть действует.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
