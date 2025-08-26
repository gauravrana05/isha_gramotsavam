import ClientProviders from "@/components/system/ClientProviders"; // New client component
import "@/styles/globals.css";
import localFont from "next/font/local";
import { cookies } from "next/headers";

const fira = localFont({
  src: [
    { path: "../../public/fonts/FiraSans-Light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/FiraSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/FiraSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/FiraSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/FiraSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-fira",
  display: "swap",
});

export const metadata = {
  title: "Isha Gramotsavam",
  description: "Official app for Isha Gramotsavam - Sports tournament celebrating rural excellence",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Isha Gramotsavam",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport = {
  themeColor: "#F28C38",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F28C38" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Isha Gramotsavam" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=2, user-scalable=yes" />
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body suppressHydrationWarning className={`${fira.className} font-fira`}>
        <ClientProviders cookies={cookieStore.toString()}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}