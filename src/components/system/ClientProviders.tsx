"use client";

import React from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import ClientOnly from "@/components/common/ClientOnly";
import { TRPCReactProvider } from "@/server/trpc/react";

// Import other providers dynamically to avoid hydration issues
import dynamic from "next/dynamic";

const ThemeProvider = dynamic(() => import("@/context/ThemeContext").then(mod => ({ default: mod.ThemeProvider })), { ssr: false });
const AuthProvider = dynamic(() => import("@/context/AuthContext").then(mod => ({ default: mod.AuthProvider })), { ssr: false });
const NotificationProvider = dynamic(() => import("@/context/NotificationContext").then(mod => ({ default: mod.NotificationProvider })), { ssr: false });
const LoadingProvider = dynamic(() => import("@/context/LoadingContext").then(mod => ({ default: mod.LoadingProvider })), { ssr: false });
const DocumentProvider = dynamic(() => import("@/context/DocumentContext").then(mod => ({ default: mod.DocumentProvider })), { ssr: false });
const OfflineIndicator = dynamic(() => import("@/components/system/OfflineIndicator"), { ssr: false });
const OfflineBanner = dynamic(() => import("@/components/system/OfflineBanner"), { ssr: false });
const ToastViewport = dynamic(() => import("@/components/ui/toast/ToastViewport"), { ssr: false });
const ProgressBar = dynamic(() => import("@/components/ui/Progress/ProgressBar"), { ssr: false });

interface ClientProvidersProps {
  children: React.ReactNode;
  cookies: string;
}

const ClientProviders: React.FC<ClientProvidersProps> = ({ children, cookies }) => {
  return (
    <ErrorBoundary>
      <TRPCReactProvider cookies={cookies}>
        <ClientOnly>
          <LoadingProvider>
            <ThemeProvider>
                <AuthProvider>
                  <DocumentProvider>
                    <NotificationProvider>
                      <ProgressBar />
                      <OfflineIndicator />
                      <OfflineBanner />
                      <ToastViewport />
                      {children}
                    </NotificationProvider>
                  </DocumentProvider>
                </AuthProvider>
            </ThemeProvider>
          </LoadingProvider>
        </ClientOnly>
      </TRPCReactProvider>
    </ErrorBoundary>
  );
};

export default ClientProviders;