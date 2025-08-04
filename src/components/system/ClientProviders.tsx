"use client";

import React from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import ClientOnly from "@/components/common/ClientOnly";

// Import other providers dynamically to avoid hydration issues
import dynamic from "next/dynamic";

const ThemeProvider = dynamic(() => import("@/context/ThemeContext").then(mod => ({ default: mod.ThemeProvider })), { ssr: false });
const OfflineProvider = dynamic(() => import("@/context/OfflineContext").then(mod => ({ default: mod.OfflineProvider })), { ssr: false });
const AuthProvider = dynamic(() => import("@/context/AuthContext").then(mod => ({ default: mod.AuthProvider })), { ssr: false });
const NotificationProvider = dynamic(() => import("@/context/NotificationContext").then(mod => ({ default: mod.NotificationProvider })), { ssr: false });
const LoadingProvider = dynamic(() => import("@/context/LoadingContext").then(mod => ({ default: mod.LoadingProvider })), { ssr: false });
const DocumentProvider = dynamic(() => import("@/context/DocumentContext").then(mod => ({ default: mod.DocumentProvider })), { ssr: false });
const OfflineIndicator = dynamic(() => import("@/components/common/OfflineIndicator"), { ssr: false });

const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ClientOnly>
          <LoadingProvider>
            <ThemeProvider>
              <OfflineProvider>
                <AuthProvider>
                  <DocumentProvider>
                    <NotificationProvider>
                      <OfflineIndicator />
                      {children}
                    </NotificationProvider>
                  </DocumentProvider>
                </AuthProvider>
              </OfflineProvider>
            </ThemeProvider>
          </LoadingProvider>
        </ClientOnly>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default ClientProviders;