export const getStoredLanguage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('preferred-language') || sessionStorage.getItem('preferred-language');
};

export const storeLanguage = (language: string, persistent: boolean = true) => {
  if (typeof window === 'undefined') return;
  
  if (persistent) {
    localStorage.setItem('preferred-language', language);
  } else {
    sessionStorage.setItem('preferred-language', language);
  }
};

export const clearStoredLanguage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('preferred-language');
  sessionStorage.removeItem('preferred-language');
};
