import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock functions
export const mockApiCall = (response: any, delay = 0) => {
  return jest.fn().mockImplementation(() =>
    new Promise((resolve) => setTimeout(() => resolve(response), delay))
  );
};

export const mockApiError = (error: string, delay = 0) => {
  return jest.fn().mockImplementation(() =>
    new Promise((_, reject) => setTimeout(() => reject(new Error(error)), delay))
  );
};

// Test utilities
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  ...overrides,
});

export const createMockEvent = (overrides = {}) => ({
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: { value: '' },
  ...overrides,
});

// Accessibility helpers
export const expectToBeAccessible = async (container: HTMLElement) => {
  const { axe, toHaveNoViolations } = await import('jest-axe');
  expect.extend(toHaveNoViolations);
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Form testing helpers
export const fillForm = (fields: Record<string, string>) => {
  Object.entries(fields).forEach(([label, value]) => {
    const input = screen.getByLabelText(new RegExp(label, 'i'));
    fireEvent.change(input, { target: { value } });
  });
};

export const submitForm = (buttonText = /submit/i) => {
  const button = screen.getByRole('button', { name: buttonText });
  fireEvent.click(button);
};
