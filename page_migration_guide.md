# Page Migration Guide: From Basic UI to AdvancedTable + EnhancedModal

This guide documents the complete migration process from basic admin pages to our standardized **AdvancedTable + EnhancedModal** pattern, based on the admin/sports migration.

## 📋 Pre-Migration Checklist

### 1. **Assess Current Implementation**
- [ ] Identify existing table/list implementation
- [ ] Check current modal/form implementation
- [ ] Review backend API endpoints available
- [ ] Note any custom validation logic
- [ ] Document current features to preserve

### 2. **Backend API Requirements**
Ensure these endpoints exist and work:
- [ ] `getItems` query with proper filtering support
- [ ] `createItem` mutation
- [ ] `updateItem` mutation  
- [ ] `deleteItem` mutation (should support soft delete)
- [ ] Proper error handling and validation

## 🏗️ Migration Steps

### Phase 1: Remove Dependencies & Cleanup

#### 1.1 **Remove Translation Dependencies**
```tsx
// ❌ Remove these imports
import { useTranslations } from 'next-intl';

// ❌ Remove these calls
const t = useTranslations('AdminSection');
const commonT = useTranslations('Common');

// ✅ Replace with hardcoded English text
title: 'No items found'
description: 'No items have been created yet.'
```

#### 1.2 **Fix Form Validation**
```tsx
// ❌ Remove if missing dependency
import { zodResolver } from '@hookform/resolvers/zod';

// ✅ Use zod validation directly
const onFormSubmit = (data: FormValues) => {
  try {
    const validatedData = schema.parse(data);
    onSubmit(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
    }
  }
};
```

### Phase 2: Implement AdvancedTable

#### 2.1 **Replace Table Component**
```tsx
// ❌ Replace basic table/list
<div className="table-container">
  {items.map(item => <ItemRow key={item.id} item={item} />)}
</div>

// ✅ With AdvancedTable
<AdvancedTable<ItemData>
  data={items}
  columns={columns}
  actions={actions}
  loading={loading}
  searchable={true}
  searchPlaceholder="Search items..."
  searchFields={['name', 'description']}
  filterable={true}
  filters={filterFields}
  sortable={true}
  selectable={true}
  selectedRows={selectedItems}
  onSelectionChange={setSelectedItems}
  onRowClick={handleRowClick}
  keyExtractor={(item) => item.id}
  headerActions={headerActions}
  headerActionsSingle={getHeaderActionsSingle}
  emptyState={emptyStateConfig}
  noSearchResultsEmptyState={noSearchResultsConfig}
  pagination={{ enabled: true }}
  persistState={false} // For mobile optimization
/>
```

#### 2.2 **Configure Columns**
```tsx
const columns = useMemo<Column<ItemData>[]>(() => [
  {
    key: 'name',
    header: 'Item Name',
    sortable: true,
    render: (_, item) => (
      <div className="flex items-center space-x-2">
        <IconComponent className="w-4 h-4 text-amber-500" />
        <span className="font-medium text-gray-900">{item.name}</span>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (_, item) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {item.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  }
], []);
```

#### 2.3 **Configure Actions (NOT in columns)**
```tsx
// ✅ Separate actions array - NOT in columns
const actions: ActionButton<ItemData>[] = useMemo(() => [
  {
    label: 'Edit',
    icon: Edit,
    onClick: (item) => handleEdit(item),
    variant: 'secondary',
  }
], []);
```

#### 2.4 **Configure Filters**
```tsx
const filterFields: FilterField[] = [
  {
    key: 'isActive',
    label: 'Status',
    type: 'select',
    category: 'Status',
    options: [
      { label: 'All', value: 'all' },
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' }
    ]
  },
  {
    key: 'category',
    label: 'Categories',
    type: 'multi-select',
    category: 'Classification',
    options: categoryOptions
  }
];
```

### Phase 3: Implement EnhancedModal

#### 3.1 **Create/Edit Modal Structure**
```tsx
<EnhancedModal
  isOpen={showCreateModal}
  onClose={() => {
    setShowCreateModal(false);
    resetForm();
  }}
  title={isEditMode ? "Edit Item" : "Create New Item"}
  subtitle={isEditMode ? "Update item details and settings" : "Create a new item with required information"}
  size="lg" // sm, base, lg, xl based on form complexity
  mobileFullScreen={true}
  scrollableBody={true}
  footer={
    <div className="flex flex-row space-x-3 sm:justify-end">
      <button
        type="button"
        onClick={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        disabled={createMutation.isPending || updateMutation.isPending}
        className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => {
          const form = document.querySelector('#item-form-element') as HTMLFormElement;
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
        disabled={createMutation.isPending || updateMutation.isPending}
        className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
      >
        {(createMutation.isPending || updateMutation.isPending)
          ? (isEditMode ? 'Updating...' : 'Creating...') 
          : (isEditMode ? 'Update Item' : 'Create Item')
        }
      </button>
    </div>
  }
>
  <div id="item-form">
    <ItemForm
      onSubmit={handleSubmit}
      defaultValues={formDefaultValues}
      isLoading={createMutation.isPending || updateMutation.isPending}
    />
  </div>
</EnhancedModal>
```

#### 3.2 **View Details Modal**
```tsx
<EnhancedModal
  isOpen={showViewModal}
  onClose={() => setShowViewModal(false)}
  title="Item Details"
  subtitle={`${selectedItem.name} - Complete Information`}
  size="lg"
  mobileFullScreen={true}
  scrollableBody={true}
  footer={
    <div className="flex justify-end space-x-2">
      <button
        onClick={() => {
          setShowViewModal(false);
          handleEdit(selectedItem);
        }}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] transition-colors"
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Item
      </button>
    </div>
  }
>
  {/* Detailed view content */}
</EnhancedModal>
```

#### 3.3 **Delete Confirmation Modal**
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
  footer={deleteFooterButtons}
>
  <div className="text-center py-4">
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
      <AlertTriangle className="h-6 w-6 text-red-600" />
    </div>
    <p className="text-gray-600 mb-4">
      Are you sure you want to delete <strong>"{itemToDelete?.name}"</strong>?
    </p>
    <p className="text-sm text-red-600">
      This action cannot be undone and will remove all associated data.
    </p>
  </div>
</EnhancedModal>
```

### Phase 4: Form Component Migration

#### 4.1 **Form Component Structure**
```tsx
// Create separate form component: ItemForm.tsx
export interface ItemFormValues {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  // ... other fields
}

export const itemFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  // ... other validations
});

export function ItemForm({ onSubmit, defaultValues, isLoading }: ItemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ItemFormValues>({
    defaultValues: defaultValues || defaultFormValues,
  });

  // Reset form when defaultValues change (for edit mode)
  React.useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const onFormSubmit = (data: ItemFormValues) => {
    try {
      const validatedData = itemFormSchema.parse(data);
      onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" id="item-form-element">
      {/* Form fields with proper validation */}
    </form>
  );
}
```

### Phase 5: State Management & Data Flow

#### 5.1 **State Variables**
```tsx
// State management
const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
const [showCreateModal, setShowCreateModal] = useState(false);
const [showViewModal, setShowViewModal] = useState(false);
const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
const [isEditMode, setIsEditMode] = useState(false);
const [itemToEdit, setItemToEdit] = useState<ItemData | null>(null);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [itemToDelete, setItemToDelete] = useState<ItemData | null>(null);
```

#### 5.2 **Data Fetching & Mutations**
```tsx
const {
  data: itemsData,
  isLoading: itemsLoading,
  error: itemsError,
  refetch: refetchItems
} = api.admin.getItems.useQuery({
  // Query params
}, {
  enabled: !!user && userProfile?.role === 'admin'
});

const createMutation = api.admin.createItem.useMutation({
  onSuccess: (data) => {
    refetchItems();
    addNotification('Item created successfully!', 'success');
    setShowCreateModal(false);
    resetForm();
  },
  onError: (error) => {
    console.error('Create error:', error);
    addNotification(error.message || 'Failed to create item.', 'error');
  },
});

const updateMutation = api.admin.updateItem.useMutation({
  onSuccess: (data) => {
    refetchItems();
    addNotification('Item updated successfully!', 'success');
    setShowCreateModal(false);
    resetForm();
  },
  onError: (error) => {
    console.error('Update error:', error);
    addNotification(error.message || 'Failed to update item.', 'error');
  },
});

const deleteMutation = api.admin.deleteItem.useMutation({
  onSuccess: () => {
    refetchItems();
    addNotification('Item deleted successfully!', 'success');
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  },
  onError: (error) => {
    console.error('Delete error:', error);
    addNotification(error.message || 'Failed to delete item.', 'error');
  },
});
```

#### 5.3 **Event Handlers**
```tsx
const handleEdit = (item: ItemData) => {
  setItemToEdit(item);
  setIsEditMode(true);
  setShowCreateModal(true);
};

const handleRowClick = (item: ItemData) => {
  setSelectedItem(item);
  setShowViewModal(true);
};

const handleSubmit = async (data: ItemFormValues) => {
  try {
    if (isEditMode && itemToEdit) {
      await updateMutation.mutateAsync({
        id: itemToEdit.id,
        ...data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  } catch (error) {
    console.error('Form submission error:', error);
  }
};

const confirmDelete = async () => {
  if (itemToDelete) {
    try {
      await deleteMutation.mutateAsync({ id: itemToDelete.id });
    } catch (error) {
      console.error('Delete confirmation error:', error);
    }
  }
};

const resetForm = () => {
  setIsEditMode(false);
  setItemToEdit(null);
};

const getHeaderActionsSingle = (selectedItems: ItemData[]) => {
  const item = selectedItems[0];
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleEdit(item)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </button>
      <button
        onClick={() => {
          setItemToDelete(item);
          setShowDeleteConfirm(true);
        }}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </button>
    </div>
  );
};
```

## 🎨 Styling & UX Guidelines

### **Button Colors (Match admin/events)**
```tsx
// Primary buttons (Create, Save, etc.)
className="bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26]"

// Secondary buttons (Edit, etc.) 
className="text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"

// Danger buttons (Delete)
className="text-white bg-red-600 rounded-lg hover:bg-red-700"
```

### **Mobile Optimization**
```tsx
// Remove these for mobile optimization:
exportOptions={exportOptions}        // ❌ Remove
onDataLoad={handleDataLoad}         // ❌ Remove (removes refresh button)
persistState={true}                  // ❌ Set to false (removes save view)
stateKey="admin-items"              // ❌ Remove

// Keep essential mobile elements:
searchable={true}                    // ✅ Keep
filterable={true}                   // ✅ Keep 
headerActions={createButton}        // ✅ Keep
```

### **Empty States**
```tsx
emptyState={{
  icon: IconComponent,
  title: 'No items found',
  description: 'No items have been created yet.',
  action: {
    label: 'Create Item',
    onClick: () => setShowCreateModal(true)
  }
}}
noSearchResultsEmptyState={{
  icon: IconComponent,
  title: 'No matching items',
  description: 'Try adjusting your search or filters to find what you\'re looking for.',
  action: {
    label: 'Clear Search',
    onClick: clearSearchAndFilters
  }
}}
```

## 🧪 Testing Checklist

### **Basic Functionality**
- [ ] Create item works and shows success toast
- [ ] Edit item works and shows success toast  
- [ ] Delete item works and shows success toast
- [ ] View item details modal works
- [ ] All form validation works properly
- [ ] Loading states work correctly

### **AdvancedTable Features**
- [ ] Search functionality works
- [ ] Filters work correctly
- [ ] Sorting works on sortable columns
- [ ] Row selection works
- [ ] Row click opens view modal
- [ ] Action buttons work
- [ ] Header actions change based on selection
- [ ] Empty states show correctly
- [ ] Pagination works

### **Mobile Responsiveness**
- [ ] Top bar doesn't break on mobile
- [ ] Search, filters, and header actions fit in one line
- [ ] Modals work properly on mobile
- [ ] Forms are usable on mobile screens
- [ ] No horizontal scrolling

### **Error Handling**
- [ ] Network errors show proper toasts
- [ ] Validation errors show in forms
- [ ] Backend errors are handled gracefully
- [ ] Loading states prevent double-clicks

## 🚨 Common Pitfalls to Avoid

### **❌ Don't Do These:**

1. **Actions in Columns**
   ```tsx
   // ❌ Wrong - actions in columns
   columns: [
     { key: 'actions', render: () => <ActionButtons /> }
   ]
   
   // ✅ Correct - separate actions prop
   actions={actionButtons}
   ```

2. **Translation Dependencies**
   ```tsx
   // ❌ Wrong - will cause build errors
   import { useTranslations } from 'next-intl';
   const t = useTranslations('Section');
   
   // ✅ Correct - hardcoded English
   title: 'Create New Item'
   ```

3. **Form Buttons in Modal Body**
   ```tsx
   // ❌ Wrong - buttons scroll with content
   <EnhancedModal>
     <form>
       <div>Fields...</div>
       <button>Submit</button>
     </form>
   </EnhancedModal>
   
   // ✅ Correct - buttons in footer
   <EnhancedModal footer={footerWithButtons}>
     <form>Fields only</form>
   </EnhancedModal>
   ```

4. **Missing Mobile Optimization**
   ```tsx
   // ❌ Wrong - cluttered mobile interface
   exportOptions={exportOptions}
   persistState={true}
   stateKey="admin-items"
   
   // ✅ Correct - clean mobile interface
   exportOptions={undefined}
   persistState={false}
   ```

5. **Duplicate State Management**
   ```tsx
   // ❌ Wrong - handling success in both places
   const handleSubmit = () => {
     mutation.mutateAsync().then(() => {
       setShowModal(false); // Don't do this
       refetch(); // Don't do this
     });
   }
   
   // ✅ Correct - handle in mutation only
   const mutation = useMutation({
     onSuccess: () => {
       setShowModal(false);
       refetch();
     }
   });
   ```

## 📝 Final Checklist

- [ ] All translation calls removed and replaced with English text
- [ ] AdvancedTable implemented with proper column/action separation
- [ ] EnhancedModal implemented for all CRUD operations
- [ ] Form component created with proper validation
- [ ] State management implemented correctly
- [ ] Mutations handle success/error properly with toasts
- [ ] Mobile optimization implemented (no export, refresh, save view)
- [ ] Styling matches admin/events pattern
- [ ] All functionality tested on desktop and mobile
- [ ] Empty states configured properly
- [ ] Loading states work correctly
- [ ] Error handling implemented

## 🐛 Common Issues and Fixes

### Double Scrollbar in Modal with Long Content

**Problem**: Modal shows two scrollbars when content height exceeds screen height - one from the modal container and one from the modal body.

**Symptoms**:
- Two vertical scrollbars visible on web and mobile
- Poor user experience with confusing scrolling behavior
- Content appears to be "trapped" with nested scrolling

**Root Cause**: Double `overflow-y-auto` - one on `EnhancedModalBackdrop` and another on `EnhancedModalBody` when `scrollableBody={true}` is used.

**Solution**: Remove `overflow-y-auto` from `EnhancedModalBackdrop` component:

```tsx
// ❌ Wrong - causes double scrollbar with modal body
const EnhancedModalBackdrop = ({ onClick, children, mobileFullScreen = false }) => (
  <div className={cn(
    'fixed inset-0 z-50 flex items-center justify-center',
    'bg-black bg-opacity-50 backdrop-blur-sm',
    'transition-all duration-300',
    mobileFullScreen ? 'sm:p-4' : 'p-4',
    'overflow-y-auto'  // ← Remove this - conflicts with body scrolling
  )}>
    {children}
  </div>
);

// ✅ Correct - let modal body handle scrolling when scrollableBody={true}
const EnhancedModalBackdrop = ({ onClick, children, mobileFullScreen = false }) => (
  <div className={cn(
    'fixed inset-0 z-50 flex items-center justify-center',
    'bg-black bg-opacity-50 backdrop-blur-sm',
    'transition-all duration-300',
    mobileFullScreen ? 'sm:p-4' : 'p-4'  // ← No overflow-y-auto here
  )}>
    {children}
  </div>
);
```

**Why this works**: When `scrollableBody={true}`, the header and footer should be fixed, and only the modal body should scroll. The backdrop's `overflow-y-auto` was creating a second scrolling container.

**Modal Structure for Long Content**:
```tsx
<EnhancedModal
  scrollableBody={true}  // ← Header/footer fixed, body scrolls
  size="lg"
  mobileFullScreen={true}
  // ... other props
>
  <div id="form-wrapper">  {/* ← Simple wrapper, no styling */}
    <YourFormComponent />
  </div>
</EnhancedModal>
```

### Filter Functionality Not Working

**Problem**: Filters appear to work in the UI but `tableParams.filters` remains empty, causing no actual filtering to occur.

**Symptoms**:
- Filter dropdowns/inputs work visually
- Console logs show `tableParams.filters: Array(0)` 
- No actual filtering happens on the data

**Root Cause**: Missing `onDataLoad` prop connection to AdvancedTable

**Solution**: Ensure the `onDataLoad={handleDataLoad}` prop is passed to AdvancedTable:

```tsx
<AdvancedTable<YourDataType>
  data={yourData}
  columns={columns}
  actions={actions}
  loading={loading}
  onDataLoad={handleDataLoad}  // ← This was missing!
  searchable={true}
  filterable={true}
  filters={filterFields}
  // ... other props
/>
```

**Why this happens**: The AdvancedTable needs the `onDataLoad` callback to communicate filter/search/sort changes back to the parent component. Without it, the table's internal state changes but never propagates to update `tableParams`.

### Form Clearing Immediately After Submission

**Problem**: When creating/editing items, the form clears immediately after successful submission, before the modal closes.

**Solution**: Remove `resetForm()` calls from mutation success handlers:

```tsx
// ❌ Wrong - causes immediate form clearing
const createMutation = api.admin.createItem.useMutation({
  onSuccess: () => {
    refetch();
    addNotification('Item created successfully!', 'success');
    setShowCreateModal(false);
    resetForm(); // ← Remove this!
  },
});

// ✅ Correct - form stays populated until modal closes
const createMutation = api.admin.createItem.useMutation({
  onSuccess: () => {
    refetch();
    addNotification('Item created successfully!', 'success');
    setShowCreateModal(false);
    // resetForm() will be called when modal closes naturally
  },
});
```

The form should only reset when the modal actually closes, allowing users to see their successful submission.

### Removing the Refresh Button

**Problem**: The AdvancedTable shows a refresh button that may not be desired for mobile optimization or clean UI.

**Solution**: Use the `showRefreshButton={false}` prop (default is `false`):

```tsx
<AdvancedTable<YourDataType>
  data={yourData}
  columns={columns}
  actions={actions}
  loading={loading}
  onDataLoad={handleDataLoad}
  showRefreshButton={false}  // ← Hide refresh button
  // ... other props
/>
```

The refresh functionality is automatically available when `onDataLoad` is provided, but the UI button is controlled separately for better UX control.

### Mobile Footer Optimization

**Problem**: Modal footer buttons are too large and take up excessive vertical space on mobile devices.

**Symptoms**:
- Footer feels bulky on mobile screens
- Buttons appear disproportionately large
- Too much vertical space consumed

**Solution**: Use responsive padding and sizing for mobile optimization:

```tsx
// ✅ Optimized mobile footer
<EnhancedModal
  footer={
    <div className="flex flex-row space-x-2 sm:space-x-3 sm:justify-end px-4 sm:px-6 py-2 sm:py-3">
      <button
        className="flex-1 sm:flex-initial sm:px-4 px-3 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
      >
        Cancel
      </button>
      <button
        className="flex-1 sm:flex-initial sm:px-4 px-3 py-1.5 sm:py-2 bg-[#F28C38] text-white rounded-md sm:rounded-lg hover:bg-[#E67A26] transition-colors font-medium text-sm"
      >
        Submit
      </button>
    </div>
  }
>
```

**Key optimizations**:
- **Container padding**: `py-2` mobile vs `py-3` desktop
- **Button padding**: `py-1.5` mobile vs `py-2` desktop  
- **Button spacing**: `space-x-2` mobile vs `space-x-3` desktop
- **Border radius**: `rounded-md` mobile vs `rounded-lg` desktop

### Form Reset Issue with Inline defaultValues

**Problem**: Form clears on every render because `defaultValues` creates new object reference each time.

**Fix**: Use `useMemo` for defaultValues and pass memoized object to form component instead of inline object creation.

### Table Selection Not Clearing After Delete

**Problem**: After deleting items, table selection remains active showing delete buttons for non-existent items.

**Fix**: Add `setSelectedItems(new Set())` to delete mutation's onSuccess handler to clear selection state.

### AdvancedTable Not Syncing with selectedRows Prop

**Problem**: AdvancedTable ignores external selectedRows prop changes and maintains its own selection state.

**Fix**: Ensure AdvancedTable properly syncs external selectedRows prop with internal state via useEffect and forwards onSelectionChange callbacks.

### Enhanced Loading State with Column-Aware Skeletons

**Feature**: AdvancedTable automatically shows proper table structure with column-specific skeleton content during loading.

**Usage**: Simply pass `loading={true}` prop to AdvancedTable - the component automatically generates appropriate skeletons based on column keys (name, status, description, dates, categories, etc.).

### Adding Skeleton Loading States to Pages

**Feature**: Create comprehensive skeleton screens that match your page layout for better loading UX.

**Implementation**: Replace generic PageLoader with custom skeleton components that mirror actual content structure (headers, cards, grids, etc.) using gray placeholders and pulse animations.

## 🎯 Success Criteria

After migration, your page should have:

✅ **Complete CRUD functionality** with proper validation and error handling
✅ **Professional UI/UX** matching the rest of the admin interface  
✅ **Mobile-optimized interface** that doesn't break on small screens
✅ **Consistent styling** with proper button colors and spacing
✅ **Proper state management** with clean data flow
✅ **Robust error handling** with meaningful user feedback
✅ **Advanced table features** like search, filtering, and sorting
✅ **Accessible modals** with proper keyboard navigation and focus management

Following this guide ensures consistency across all admin pages and prevents having to redo work later!