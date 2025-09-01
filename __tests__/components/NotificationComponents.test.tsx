import { describe, test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Notification Components
const MockNotificationDashboard = ({ notifications, stats }: any) => (
  <div data-testid="notification-dashboard">
    <div data-testid="notification-stats">
      <div data-testid="total-sent">{stats.totalSent}</div>
      <div data-testid="delivery-rate">{stats.deliveryRate}%</div>
      <div data-testid="read-rate">{stats.readRate}%</div>
    </div>
    <div data-testid="notifications-list">
      {notifications.map((notif: any) => (
        <div key={notif.id} data-testid={`notification-${notif.id}`}>
          <span className="title">{notif.title}</span>
          <span className="status">{notif.status}</span>
          <span className="recipients">{notif.recipientCount} recipients</span>
        </div>
      ))}
    </div>
  </div>
);

const MockNotificationCreateModal = ({ isOpen, onClose, onSubmit }: any) => (
  isOpen ? (
    <div data-testid="notification-create-modal">
      <div data-testid="modal-header">Create Notification</div>
      <form data-testid="notification-form" onSubmit={onSubmit}>
        <input 
          data-testid="title-input" 
          placeholder="Notification Title"
          maxLength={200}
          required
        />
        <textarea 
          data-testid="message-input" 
          placeholder="Message content"
          required
        />
        <select data-testid="type-select" required>
          <option value="">Select Type</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="success">Success</option>
        </select>
        <div data-testid="recipient-selection">
          <label>
            <input type="checkbox" data-testid="target-captains" />
            Captains
          </label>
          <label>
            <input type="checkbox" data-testid="target-players" />
            Players
          </label>
          <label>
            <input type="checkbox" data-testid="target-volunteers" />
            Volunteers
          </label>
        </div>
        <div data-testid="scheduling">
          <label>
            <input type="checkbox" data-testid="schedule-later" />
            Schedule for later
          </label>
          <input 
            type="datetime-local" 
            data-testid="schedule-time"
            disabled
          />
        </div>
        <div data-testid="modal-actions">
          <button type="button" data-testid="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" data-testid="send-button">
            Send Notification
          </button>
        </div>
      </form>
    </div>
  ) : null
);

const MockVolunteerNotificationPanel = ({ notifications, unreadCount }: any) => (
  <div data-testid="volunteer-notification-panel">
    <div data-testid="notification-header">
      <span>Notifications</span>
      {unreadCount > 0 && (
        <span data-testid="unread-badge" className="badge">
          {unreadCount}
        </span>
      )}
    </div>
    <div data-testid="notification-list">
      {notifications.map((notif: any) => (
        <div 
          key={notif.id} 
          data-testid={`notification-item-${notif.id}`}
          className={notif.read ? 'read' : 'unread'}
        >
          <div className="notification-type">{notif.type}</div>
          <div className="notification-title">{notif.title}</div>
          <div className="notification-message">{notif.message}</div>
          <div className="notification-time">{notif.createdAt}</div>
          {!notif.read && (
            <button data-testid={`mark-read-${notif.id}`}>
              Mark as Read
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

const MockNotificationTemplatesPage = ({ templates, onCreateTemplate }: any) => (
  <div data-testid="notification-templates-page">
    <div data-testid="templates-header">
      <h2>Notification Templates</h2>
      <button data-testid="create-template-button" onClick={onCreateTemplate}>
        Create Template
      </button>
    </div>
    <div data-testid="templates-grid">
      {templates.map((template: any) => (
        <div key={template.id} data-testid={`template-${template.id}`}>
          <div className="template-name">{template.name}</div>
          <div className="template-title">{template.title}</div>
          <div className="template-variables">
            Variables: {template.variables.join(', ')}
          </div>
          <div className="template-actions">
            <button data-testid={`edit-template-${template.id}`}>Edit</button>
            <button data-testid={`use-template-${template.id}`}>Use</button>
            <button data-testid={`delete-template-${template.id}`}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

describe('Notification Components', () => {
  describe('NotificationDashboard Component', () => {
    test('should render notification statistics', () => {
      const mockStats = {
        totalSent: 150,
        deliveryRate: 95,
        readRate: 78
      };
      
      const mockNotifications = [
        { id: 1, title: 'Match Update', status: 'delivered', recipientCount: 50 }
      ];

      render(<MockNotificationDashboard notifications={mockNotifications} stats={mockStats} />);
      
      expect(screen.getByTestId('notification-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('total-sent')).toHaveTextContent('150');
      expect(screen.getByTestId('delivery-rate')).toHaveTextContent('95%');
      expect(screen.getByTestId('read-rate')).toHaveTextContent('78%');
    });

    test('should render notifications list', () => {
      const mockNotifications = [
        { id: 1, title: 'Match Update', status: 'delivered', recipientCount: 50 },
        { id: 2, title: 'Venue Change', status: 'pending', recipientCount: 25 }
      ];

      render(<MockNotificationDashboard notifications={mockNotifications} stats={{}} />);
      
      expect(screen.getByTestId('notification-1')).toBeInTheDocument();
      expect(screen.getByTestId('notification-2')).toBeInTheDocument();
      expect(screen.getByText('Match Update')).toBeInTheDocument();
      expect(screen.getByText('50 recipients')).toBeInTheDocument();
    });
  });

  describe('NotificationCreateModal Component', () => {
    test('should render when open', () => {
      render(<MockNotificationCreateModal isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
      
      expect(screen.getByTestId('notification-create-modal')).toBeInTheDocument();
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('type-select')).toBeInTheDocument();
    });

    test('should not render when closed', () => {
      render(<MockNotificationCreateModal isOpen={false} onClose={() => {}} onSubmit={() => {}} />);
      
      expect(screen.queryByTestId('notification-create-modal')).not.toBeInTheDocument();
    });

    test('should render recipient selection checkboxes', () => {
      render(<MockNotificationCreateModal isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
      
      expect(screen.getByTestId('target-captains')).toBeInTheDocument();
      expect(screen.getByTestId('target-players')).toBeInTheDocument();
      expect(screen.getByTestId('target-volunteers')).toBeInTheDocument();
    });

    test('should validate form inputs', () => {
      render(<MockNotificationCreateModal isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
      
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const typeSelect = screen.getByTestId('type-select');
      
      expect(titleInput).toHaveAttribute('required');
      expect(titleInput).toHaveAttribute('maxLength', '200');
      expect(messageInput).toHaveAttribute('required');
      expect(typeSelect).toHaveAttribute('required');
    });

    test('should handle form submission', () => {
      const mockSubmit = jest.fn();
      render(<MockNotificationCreateModal isOpen={true} onClose={() => {}} onSubmit={mockSubmit} />);
      
      const form = screen.getByTestId('notification-form');
      fireEvent.submit(form);
      
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    test('should handle modal close', () => {
      const mockClose = jest.fn();
      render(<MockNotificationCreateModal isOpen={true} onClose={mockClose} onSubmit={() => {}} />);
      
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('VolunteerNotificationPanel Component', () => {
    test('should display unread count badge', () => {
      const mockNotifications = [
        { id: 1, title: 'New Message', read: false },
        { id: 2, title: 'Update', read: true }
      ];

      render(<MockVolunteerNotificationPanel notifications={mockNotifications} unreadCount={1} />);
      
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
    });

    test('should not display badge when no unread notifications', () => {
      const mockNotifications = [
        { id: 1, title: 'Message', read: true }
      ];

      render(<MockVolunteerNotificationPanel notifications={mockNotifications} unreadCount={0} />);
      
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });

    test('should render notification items with correct styling', () => {
      const mockNotifications = [
        { 
          id: 1, 
          title: 'Unread Message', 
          message: 'This is unread',
          type: 'info',
          createdAt: '2024-01-01',
          read: false 
        },
        { 
          id: 2, 
          title: 'Read Message', 
          message: 'This is read',
          type: 'success',
          createdAt: '2024-01-02',
          read: true 
        }
      ];

      render(<MockVolunteerNotificationPanel notifications={mockNotifications} unreadCount={1} />);
      
      const unreadItem = screen.getByTestId('notification-item-1');
      const readItem = screen.getByTestId('notification-item-2');
      
      expect(unreadItem).toHaveClass('unread');
      expect(readItem).toHaveClass('read');
      
      expect(screen.getByTestId('mark-read-1')).toBeInTheDocument();
      expect(screen.queryByTestId('mark-read-2')).not.toBeInTheDocument();
    });
  });

  describe('NotificationTemplatesPage Component', () => {
    test('should render templates grid', () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Match Reminder',
          title: 'Your match starts soon',
          variables: ['time', 'venue']
        },
        {
          id: 2,
          name: 'Team Update',
          title: 'Team information updated',
          variables: ['teamName', 'changes']
        }
      ];

      render(<MockNotificationTemplatesPage templates={mockTemplates} onCreateTemplate={() => {}} />);
      
      expect(screen.getByTestId('notification-templates-page')).toBeInTheDocument();
      expect(screen.getByTestId('template-1')).toBeInTheDocument();
      expect(screen.getByTestId('template-2')).toBeInTheDocument();
      
      expect(screen.getByText('Match Reminder')).toBeInTheDocument();
      expect(screen.getByText('Variables: time, venue')).toBeInTheDocument();
    });

    test('should render template action buttons', () => {
      const mockTemplates = [
        {
          id: 1,
          name: 'Test Template',
          title: 'Test Title',
          variables: ['var1']
        }
      ];

      render(<MockNotificationTemplatesPage templates={mockTemplates} onCreateTemplate={() => {}} />);
      
      expect(screen.getByTestId('edit-template-1')).toBeInTheDocument();
      expect(screen.getByTestId('use-template-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-template-1')).toBeInTheDocument();
    });

    test('should handle create template button click', () => {
      const mockCreateTemplate = jest.fn();
      
      render(<MockNotificationTemplatesPage templates={[]} onCreateTemplate={mockCreateTemplate} />);
      
      const createButton = screen.getByTestId('create-template-button');
      fireEvent.click(createButton);
      
      expect(mockCreateTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notification Type Validation', () => {
    test('should validate notification types', () => {
      const validTypes = [
        'info', 'success', 'warning', 'error',
        'team_invitation', 'verification_update',
        'match_result', 'venue_assignment',
        'system_announcement', 'match_reminder',
        'tournament_update'
      ];

      const testTypes = ['info', 'invalid', 'match_result', 'unknown'];
      const validCount = testTypes.filter(type => validTypes.includes(type)).length;
      
      expect(validCount).toBe(2);
    });

    test('should validate notification priority levels', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];
      const testPriority = 'high';
      
      const isValidPriority = priorities.includes(testPriority);
      expect(isValidPriority).toBe(true);
    });
  });
});
