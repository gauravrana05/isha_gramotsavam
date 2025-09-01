import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/forms/LoginForm';
import { AuthProvider } from '@/hooks/useAuth';
import { mockUser, mockAuthResponse } from '../utils/mock-data';

// Mock API calls
jest.mock('@/utils/api-client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginForm', () => {
    it('renders login form correctly', () => {
      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      render(
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      const mockLogin = jest.fn().mockResolvedValue(mockAuthResponse);
      
      render(
        <AuthProvider>
          <LoginForm onSubmit={mockLogin} />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('displays error message on failed login', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      render(
        <AuthProvider>
          <LoginForm onSubmit={mockLogin} />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('AuthProvider', () => {
    it('provides authentication context', () => {
      const TestComponent = () => {
        const { user, login, logout } = useAuth();
        return (
          <div>
            <span data-testid="user">{user ? user.name : 'Not logged in'}</span>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
            <button onClick={logout}>Logout</button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('Not logged in');
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });
});
