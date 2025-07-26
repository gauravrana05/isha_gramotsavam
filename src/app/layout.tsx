import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/system/ClientProviders"; // New client component

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Isha Gramotsavam",
  description: "Annual Rural Sports Festival Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("Rendering root layout.tsx");
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Isha Gramotsavam" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2, user-scalable=yes" />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen font-roboto`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}