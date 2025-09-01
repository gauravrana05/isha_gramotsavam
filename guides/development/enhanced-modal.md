# EnhancedModal Usage Guide

## Overview

The `EnhancedModal` component is a flexible and responsive modal system that provides better UX than standard modals, with mobile-first design, proper scrolling behavior, and fixed footer positioning.

## Key Features

- **Responsive Design**: Mobile fullscreen with desktop sizing
- **Fixed Footer**: Buttons stay at bottom, content scrolls independently  
- **Dynamic Height**: Adjusts to content size
- **Mobile Optimized**: Better touch interaction and text sizing
- **Accessibility**: Focus trapping, keyboard navigation, screen reader support

## Basic Usage

```tsx
import { EnhancedModal } from '@/components/ui/EnhancedModal';

<EnhancedModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Modal Title"
  subtitle="Optional subtitle or description"
  size="xl"
  mobileFullScreen={true}
  scrollableBody={true}
  footer={footerContent}
>
  {/* Modal content */}
</EnhancedModal>
```

## Props Reference

### Required Props
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Called when modal should close

### Essential Props
- `title?: string` - Main modal title
- `subtitle?: string` - Descriptive text under title
- `footer?: ReactNode` - Fixed footer content (usually buttons)

### Size & Layout
- `size?: 'sm' | 'base' | 'lg' | 'xl' | 'full' | 'dynamic'`
  - `sm`: 384px max-width - Simple confirmations
  - `base`: 512px max-width - Standard forms  
  - `lg`: 768px max-width - Complex forms
  - `xl`: 896px max-width - Data tables, detailed forms
  - `full`: Full width with margin - Large content
  - `dynamic`: Responsive width - Adapts to content

### Mobile Behavior
- `mobileFullScreen?: boolean` - Makes modal fullscreen on mobile
- `dynamicHeight?: boolean` - Adjusts height to content
- `scrollableBody?: boolean` - Enables body scrolling (recommended: true)

### Interaction
- `closeOnOverlayClick?: boolean` - Close when clicking outside (default: true)
- `closeOnEscape?: boolean` - Close on Escape key (default: true)
- `showCloseButton?: boolean` - Show X button in header (default: true)

### Advanced
- `preventScroll?: boolean` - Lock body scroll when open (default: true)
- `headerActions?: ReactNode` - Additional header buttons
- `transition?: boolean` - Enable animations (default: true)

## Common Patterns

### 1. Form Modal (Most Common)
Use for create/edit forms with fixed submit buttons.

```tsx
const footer = (
  <div className="flex flex-row space-x-3 sm:justify-end">
    <button
      onClick={onClose}
      className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
    >
      Cancel
    </button>
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
    >
      {isLoading ? 'Saving...' : 'Save'}
    </button>
  </div>
);

<EnhancedModal
  isOpen={isOpen}
  onClose={onClose}
  title="Create Event"
  subtitle="Enter event details"
  size="xl"
  mobileFullScreen={true}
  scrollableBody={true}
  footer={footer}
>
  <form className="space-y-6">
    {/* Form fields */}
  </form>
</EnhancedModal>
```

### 2. Detail/View Modal
For displaying detailed information, often read-only.

```tsx
<EnhancedModal
  isOpen={isOpen}
  onClose={onClose}
  title="Player Details"
  subtitle="John Doe - +91 9876543210"
  size="xl"
  mobileFullScreen={true}
  scrollableBody={true}
  footer={
    <button
      onClick={onEdit}
      className="bg-[#F28C38] text-white px-4 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
    >
      Edit Player
    </button>
  }
>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Content layout */}
  </div>
</EnhancedModal>
```

### 3. Dynamic Search Modal
Content changes based on user interaction.

```tsx
<EnhancedModal
  isOpen={isOpen}
  onClose={onClose}
  title="Add Player"
  size={hasResults ? 'lg' : 'base'}
  mobileFullScreen={hasResults}
  dynamicHeight={true}
  scrollableBody={true}
  closeOnOverlayClick={false} // Prevent accidental close
  footer={conditionalFooter}
>
  {/* Search and results */}
</EnhancedModal>
```

### 4. Simple Confirmation Modal
```tsx
<EnhancedModal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
  subtitle="This action cannot be undone"
  size="sm"
  footer={
    <div className="flex space-x-3">
      <button onClick={onClose}>Cancel</button>
      <button onClick={onConfirm}>Confirm</button>
    </div>
  }
>
  <p>Are you sure you want to delete this item?</p>
</EnhancedModal>
```

### 5. Edit/Create Modal (Advanced Pattern)
```tsx
// State management for edit mode
const [isEditMode, setIsEditMode] = useState(false);
const [itemToEdit, setItemToEdit] = useState(null);
const [formData, setFormData] = useState(defaultData);

// Format data for editing
const populateFormWithItem = (item) => {
  setFormData({
    name: item.name,
    description: item.description || '',
    // Format dates for HTML inputs
    startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
    // ... other fields
  });
};

// Handle edit action
const handleEdit = (item) => {
  setItemToEdit(item);
  setIsEditMode(true);
  populateFormWithItem(item);
  setShowModal(true);
};

// Handle submit
const handleSubmit = async () => {
  if (isEditMode && itemToEdit) {
    await updateMutation.mutateAsync({ id: itemToEdit.id, ...formData });
  } else {
    await createMutation.mutateAsync(formData);
  }
};

// Modal with dynamic title and buttons
<EnhancedModal
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    resetForm();
    setIsEditMode(false);
    setItemToEdit(null);
  }}
  title={isEditMode ? "Edit Item" : "Create New Item"}
  subtitle={isEditMode ? "Update item details" : "Enter item information"}
  size="xl"
  mobileFullScreen={true}
  scrollableBody={true}
  footer={
    <div className="flex flex-row space-x-3 sm:justify-end">
      <button
        type="button"
        onClick={() => {
          setShowModal(false);
          resetForm();
          setIsEditMode(false);
          setItemToEdit(null);
        }}
        disabled={isLoading}
        className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
      >
        {isLoading 
          ? (isEditMode ? 'Updating...' : 'Creating...') 
          : (isEditMode ? 'Update Item' : 'Create Item')
        }
      </button>
    </div>
  }
>
  <div className="space-y-6">
    {/* Form fields */}
  </div>
</EnhancedModal>
```

### 6. Delete Confirmation Modal
```tsx
<EnhancedModal
  isOpen={showDeleteConfirm}
  onClose={() => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }}
  title="Confirm Delete"
  subtitle="This action cannot be undone"
  size="sm"
  footer={
    <div className="flex flex-row space-x-3 sm:justify-end">
      <button
        onClick={() => setShowDeleteConfirm(false)}
        disabled={deleteLoading}
        className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
      >
        Cancel
      </button>
      <button
        onClick={confirmDelete}
        disabled={deleteLoading}
        className="flex-1 sm:flex-initial sm:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium py-2 text-sm"
      >
        {deleteLoading ? 'Deleting...' : 'Delete Item'}
      </button>
    </div>
  }
>
  <div className="text-center py-4">
    <p className="text-gray-600 mb-4">
      Are you sure you want to delete <strong>"{itemToDelete?.name}"</strong>?
    </p>
    <p className="text-sm text-red-600">
      This action cannot be undone and will permanently remove all associated data.
    </p>
  </div>
</EnhancedModal>
```

## Notification Integration

Use `useNotification` for success/error feedback instead of alerts:

```tsx
import { useNotification } from '@/context/NotificationContext';

const { addNotification } = useNotification();

// In mutation callbacks
const createMutation = api.item.create.useMutation({
  onSuccess: () => {
    addNotification('Item created successfully', 'success');
    setShowModal(false);
  },
  onError: (error) => {
    addNotification('Failed to create item. Please try again.', 'error');
  },
});
```

## Best Practices

### ✅ Do's

1. **Use fixed footer for actions**
   ```tsx
   footer={
     <div className="flex flex-row space-x-3 sm:justify-end">
       <button>Cancel</button>
       <button>Save</button>
     </div>
   }
   ```

2. **Enable scrollableBody for long content**
   ```tsx
   scrollableBody={true}
   ```

3. **Use mobileFullScreen for complex modals**
   ```tsx
   mobileFullScreen={true}  // For forms, detailed views
   ```

4. **Proper button styling for mobile**
   ```tsx
   className="flex-1 sm:flex-initial sm:px-4 py-2 text-sm"
   ```

5. **Use appropriate sizes**
   - `sm`: Confirmations, simple actions
   - `base`: Basic forms (3-5 fields)
   - `lg`: Standard forms (6-10 fields)
   - `xl`: Complex forms, data display

### ❌ Don'ts

1. **Don't put buttons in body content**
   ```tsx
   // ❌ Wrong - buttons scroll with content
   <EnhancedModal>
     <form>
       <div>...</div>
       <button>Submit</button> {/* This scrolls away */}
     </form>
   </EnhancedModal>
   ```

2. **Don't disable scrollableBody for long content**
   ```tsx
   // ❌ Wrong - causes double scrollbars
   scrollableBody={false} // When content is tall
   ```

3. **Don't use full viewport height**
   ```tsx
   // ❌ Wrong - causes layout issues
   <div className="h-screen">
   ```

4. **Don't mix modal patterns**
   ```tsx
   // ❌ Wrong - inconsistent sizing
   size="sm" mobileFullScreen={true} // Conflicting settings
   ```

## Size Guidelines

| Size | Max Width | Use Case | Mobile Behavior |
|------|-----------|----------|-----------------|
| `sm` | 384px | Confirmations, alerts | Centered modal |
| `base` | 512px | Basic forms | Centered or fullscreen |
| `lg` | 768px | Standard forms | Usually fullscreen |
| `xl` | 896px | Complex forms, tables | Always fullscreen |
| `full` | Full width | Large content | Full width |
| `dynamic` | Responsive | Adaptive content | Responsive |

## Mobile Considerations

1. **Text Size**: Use `text-sm` for buttons and labels on mobile
2. **Touch Targets**: Minimum 44px height for buttons  
3. **Fullscreen**: Use for forms and detailed content
4. **Fixed Footer**: Always use footer prop for action buttons
5. **Prevent Close**: Use `closeOnOverlayClick={false}` for forms

## Troubleshooting

### Double Scrollbars
- **Cause**: `scrollableBody={false}` with tall content
- **Fix**: Set `scrollableBody={true}`

### Buttons Not Fixed
- **Cause**: Buttons in body instead of footer
- **Fix**: Move buttons to `footer` prop

### Mobile Text Too Large  
- **Cause**: Using desktop text sizes
- **Fix**: Use `text-sm` class for mobile

### Modal Not Responsive
- **Cause**: Fixed dimensions in content
- **Fix**: Use appropriate `size` prop and `mobileFullScreen`

## Examples from Codebase

See these implementations for reference:
- `/src/components/modals/PlayerDetailModal.tsx` - Detail view pattern
- `/src/components/modals/AddPlayerModal.tsx` - Dynamic form pattern
- `/src/app/[lang]/admin/events/page.tsx` - Create form pattern