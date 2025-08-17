'use client'
import { useState, useCallback } from 'react';

export interface AlertState {
  isOpen: boolean;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showAlert = useCallback((
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    title?: string
  ) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      title,
    });
  }, []);

  const showError = useCallback((message: string, title?: string) => {
    showAlert(message, 'error', title);
  }, [showAlert]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showAlert(message, 'success', title);
  }, [showAlert]);

  const showWarning = useCallback((message: string, title?: string) => {
    showAlert(message, 'warning', title);
  }, [showAlert]);

  const showInfo = useCallback((message: string, title?: string) => {
    showAlert(message, 'info', title);
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  return {
    alertState,
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    hideAlert,
  };
};