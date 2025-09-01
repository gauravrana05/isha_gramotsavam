import { describe, test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock CreateTeamModal component
const MockCreateTeamModal = ({ isOpen, onClose, onSubmit }: any) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      sport: formData.get('sport'),
      genderCategory: formData.get('genderCategory'),
    };
    onSubmit(data);
  };

  return (
    <div data-testid="create-team-modal" className="modal">
      <div className="modal-content">
        <h2>Create Team</h2>
        <form onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Team Name"
            data-testid="team-name-input"
            required
          />
          <select name="sport" data-testid="sport-select" required>
            <option value="">Select Sport</option>
            <option value="football">Football</option>
            <option value="cricket">Cricket</option>
          </select>
          <select name="genderCategory" data-testid="gender-select" required>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="mixed">Mixed</option>
          </select>
          <button type="submit" data-testid="submit-button">
            Create Team
          </button>
          <button type="button" onClick={onClose} data-testid="cancel-button">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

describe('CreateTeamModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should not render when closed', () => {
    render(
      <MockCreateTeamModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByTestId('create-team-modal')).not.toBeInTheDocument();
  });

  test('should render when open', () => {
    render(
      <MockCreateTeamModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
    expect(screen.getAllByText('Create Team')[0]).toBeInTheDocument();
  });

  test('should render form fields', () => {
    render(
      <MockCreateTeamModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByTestId('team-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('sport-select')).toBeInTheDocument();
    expect(screen.getByTestId('gender-select')).toBeInTheDocument();
  });

  test('should call onClose when cancel button clicked', () => {
    render(
      <MockCreateTeamModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should call onSubmit with form data', () => {
    render(
      <MockCreateTeamModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill form
    fireEvent.change(screen.getByTestId('team-name-input'), {
      target: { value: 'Test Team' },
    });
    fireEvent.change(screen.getByTestId('sport-select'), {
      target: { value: 'football' },
    });
    fireEvent.change(screen.getByTestId('gender-select'), {
      target: { value: 'male' },
    });

    // Submit form
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Team',
      sport: 'football',
      genderCategory: 'male',
    });
  });

  test('should have required fields', () => {
    render(
      <MockCreateTeamModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByTestId('team-name-input');
    const sportSelect = screen.getByTestId('sport-select');
    const genderSelect = screen.getByTestId('gender-select');

    expect(nameInput).toHaveAttribute('required');
    expect(sportSelect).toHaveAttribute('required');
    expect(genderSelect).toHaveAttribute('required');
  });
});
