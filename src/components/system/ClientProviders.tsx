"use client";

import React from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <OfflineProvider>
            <AuthProvider>
              <NotificationProvider>
                <OfflineIndicator />
                {children}
              </NotificationProvider>
            </AuthProvider>
          </OfflineProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default ClientProviders;