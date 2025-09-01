# AdvancedTable Usage Guide

## Overview

The `AdvancedTable` component is a comprehensive, feature-rich table system that provides advanced functionality for displaying and manipulating tabular data. It combines table rendering, search, filtering, sorting, pagination, export capabilities, and server-side data loading in a single, highly configurable component.

## Key Features

- **Server-side & Client-side Operations**: Supports both client-side and server-side data processing
- **Advanced Search**: Global search with customizable search fields
- **Dynamic Filtering**: Side panel filters with multiple operators and field types  
- **Multi-column Sorting**: Sort by multiple columns with customizable sort keys
- **Smart Pagination**: Client and server-side pagination with customizable page sizes
- **Row Selection**: Single and multi-row selection with bulk actions
- **Export Functionality**: Export filtered/sorted data in multiple formats
- **Expandable Rows**: Nested content with custom render functions
- **State Persistence**: URL-based state management for bookmarkable views
- **Saved Views**: Save and restore filter/search/sort configurations
- **Empty States**: Customizable empty states for no data and no search results
- **Responsive Design**: Mobile-friendly with sticky headers and compact modes

## Basic Usage

```tsx
import { AdvancedTable } from '@/components/ui/AdvancedTable';

<AdvancedTable
  data={items}
  columns={columns}
  loading={isLoading}
  searchable={true}
  filterable={true}
  sortable={true}
  pagination={{ enabled: true }}
/>
```

## Props Reference

### Data & Display Props

#### Required Props
- `data: T[]` - Array of data items to display
- `columns: Column<T>[]` - Column configuration array

#### Loading & State
- `loading?: boolean` - Shows loading state overlay
- `keyExtractor?: (item: T, index: number) => string | number` - Unique key function (defaults to index)

### Search Configuration

- `searchable?: boolean` - Enable global search functionality (default: false)
- `searchPlaceholder?: string` - Search input placeholder text (default: "Search...")
- `searchFields?: (keyof T)[]` - Specific fields to search in (defaults to all columns)

### Filter Configuration

- `filterable?: boolean` - Enable filtering functionality (default: false) 
- `filters?: FilterField[]` - Available filter field configurations

### Sort Configuration

- `sortable?: boolean` - Enable column sorting (default: false)
- `multiSort?: boolean` - Allow sorting by multiple columns (default: false)
- `defaultSort?: SortConfig[]` - Initial sort configuration

### Pagination Configuration

```tsx
pagination?: {
  enabled: boolean;           // Enable/disable pagination
  pageSize?: number;         // Items per page (default: 25)
  pageSizeOptions?: number[]; // Available page size options
  serverSide?: boolean;      // Server-side pagination mode
  total?: number;           // Total items (for server-side)
}
```

### Selection Configuration

- `selectable?: boolean` - Enable row selection (default: false)
- `selectedRows?: Set<string | number>` - Currently selected row keys
- `onSelectionChange?: (selectedRows: Set<string | number>) => void` - Selection change handler

### Action Configuration

- `actions?: ActionButton<T>[]` - Row-level action buttons
- `bulkActions?: BulkAction[]` - Bulk actions for selected rows
- `exportOptions?: ExportConfig[]` - Export format configurations

### Row Interaction

- `onRowClick?: (item: T, index: number) => void` - Row click handler
- `expandable?: boolean` - Enable expandable rows (default: false)
- `expandedRows?: Set<string | number>` - Currently expanded row keys
- `onRowExpand?: (item: T, expanded: boolean) => void` - Row expand handler
- `renderExpandedContent?: (item: T, index: number) => React.ReactNode` - Expanded content renderer

### Server-side Data Loading

```tsx
onDataLoad?: (params: TableParams) => Promise<void> | void;

// TableParams interface
interface TableParams {
  search: string;
  sort: SortConfig[];
  filters: ActiveFilter[];
  page: number;
  pageSize: number;
}
```

### State Management

- `persistState?: boolean` - Enable URL state persistence (default: false)
- `stateKey?: string` - Unique key for saved views functionality

### Header Actions

- `headerActions?: React.ReactNode` - Static header actions
- `headerActionsNone?: React.ReactNode` - Actions when no rows selected
- `headerActionsSingle?: (selectedItems: T[]) => React.ReactNode` - Actions for single selection
- `headerActionsMultiple?: (selectedItems: T[]) => React.ReactNode` - Actions for multiple selection

### Empty States

```tsx
emptyState?: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

noSearchResultsEmptyState?: {
  // Same interface as emptyState
  // Shown when data exists but search/filters return no results
}
```

### Styling & Layout

- `compact?: boolean` - Enable compact display mode
- `stickyHeader?: boolean` - Make table header sticky on scroll
- `title?: string` - Table title
- `subtitle?: string` - Table subtitle
- `additionalActions?: React.ReactNode` - Additional header content

## Column Configuration

```tsx
interface Column<T> {
  key: string;                    // Unique column identifier
  header: string;                 // Column header text
  accessor?: keyof T | ((item: T) => any); // Data accessor
  sortKey?: string;              // Custom sort key (defaults to key)
  sortable?: boolean;            // Column-specific sortable override
  width?: string;                // Fixed column width
  minWidth?: number;             // Minimum column width
  className?: string;            // Column CSS classes
  render?: (value: any, item: T, index: number) => React.ReactNode;
}
```

## Common Patterns

### 1. Basic Data Display

```tsx
const columns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { 
    key: 'status', 
    header: 'Status',
    render: (value) => (
      <span className={`badge ${value === 'active' ? 'success' : 'warning'}`}>
        {value}
      </span>
    )
  }
];

<AdvancedTable
  data={users}
  columns={columns}
  searchable={true}
  sortable={true}
  pagination={{ enabled: true }}
/>
```

### 2. Server-side Data Loading

```tsx
const handleDataLoad = useCallback(async (params: TableParams) => {
  const response = await api.getUsers({
    search: params.search,
    sort: params.sort,
    filters: params.filters,
    page: params.page,
    limit: params.pageSize
  });
  setUsers(response.data);
  setTotalCount(response.total);
}, []);

<AdvancedTable
  data={users}
  columns={columns}
  loading={loading}
  onDataLoad={handleDataLoad}
  pagination={{ 
    enabled: true, 
    serverSide: true, 
    total: totalCount 
  }}
  persistState={true}
  stateKey="users-table"
/>
```

### 3. Advanced Filtering

```tsx
const filterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    category: 'User',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' }
    ]
  },
  {
    key: 'dateRange',
    label: 'Created Date',
    type: 'date-range',
    category: 'Timeline'
  },
  {
    key: 'role',
    label: 'Role',
    type: 'multi-select',
    category: 'Permissions',
    options: roleOptions
  }
];

<AdvancedTable
  data={users}
  columns={columns}
  filterable={true}
  filters={filterFields}
/>
```

### 4. Row Selection with Bulk Actions

```tsx
const bulkActions: BulkAction[] = [
  {
    label: 'Export Selected',
    icon: Download,
    onClick: (selectedItems) => exportUsers(selectedItems),
    variant: 'secondary'
  },
  {
    label: 'Deactivate Selected',
    icon: UserX,
    onClick: (selectedItems) => deactivateUsers(selectedItems),
    variant: 'danger',
    requireConfirm: true
  }
];

<AdvancedTable
  data={users}
  columns={columns}
  selectable={true}
  selectedRows={selectedRows}
  onSelectionChange={setSelectedRows}
  bulkActions={bulkActions}
/>
```

### 5. Expandable Rows with Nested Data

```tsx
<AdvancedTable
  data={teams}
  columns={teamColumns}
  expandable={true}
  expandedRows={expandedTeams}
  onRowExpand={(team, expanded) => {
    const newExpanded = new Set(expandedTeams);
    if (expanded) {
      newExpanded.add(team.id);
      loadTeamPlayers(team.id); // Load nested data
    } else {
      newExpanded.delete(team.id);
    }
    setExpandedTeams(newExpanded);
  }}
  renderExpandedContent={(team) => (
    <div className="p-4 bg-gray-50">
      <h4 className="font-medium mb-2">Players ({team.playerCount})</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {teamPlayers[team.id]?.map(player => (
          <div key={player.id} className="p-2 bg-white rounded">
            {player.name} - {player.position}
          </div>
        ))}
      </div>
    </div>
  )}
/>
```

### 6. Export Functionality

```tsx
const exportOptions: ExportConfig[] = [
  {
    label: 'Export CSV',
    format: 'csv',
    filename: 'users-export'
  },
  {
    label: 'Export Excel',
    format: 'xlsx',
    filename: 'users-export'
  }
];

<AdvancedTable
  data={users}
  columns={columns}
  exportOptions={exportOptions}
/>
```

### 7. Dynamic Header Actions

```tsx
<AdvancedTable
  data={users}
  columns={columns}
  selectable={true}
  headerActionsNone={
    <Button onClick={() => setShowCreateModal(true)}>
      Add User
    </Button>
  }
  headerActionsSingle={(selectedUsers) => (
    <div className="flex gap-2">
      <Button onClick={() => editUser(selectedUsers[0])}>
        Edit User
      </Button>
      <Button 
        variant="danger"
        onClick={() => deleteUser(selectedUsers[0])}
      >
        Delete User
      </Button>
    </div>
  )}
  headerActionsMultiple={(selectedUsers) => (
    <Button 
      variant="danger"
      onClick={() => deleteMultipleUsers(selectedUsers)}
    >
      Delete {selectedUsers.length} Users
    </Button>
  )}
/>
```

### 8. Custom Empty States

```tsx
<AdvancedTable
  data={events}
  columns={columns}
  emptyState={{
    icon: Calendar,
    title: 'No events found',
    description: 'No events have been created yet.',
    action: {
      label: 'Create Event',
      onClick: () => setShowCreateModal(true)
    }
  }}
  noSearchResultsEmptyState={{
    icon: Search,
    title: 'No matching events',
    description: 'Try adjusting your search or filters.',
    action: {
      label: 'Clear Filters',
      onClick: clearFilters
    }
  }}
/>
```

### 9. Saved Views (Bookmarkable States)

```tsx
// Enable saved views with a unique state key
<AdvancedTable
  data={users}
  columns={columns}
  filterable={true}
  filters={filterFields}
  persistState={true}
  stateKey="admin-users" // Unique identifier for this table's saved views
  searchable={true}
  sortable={true}
/>
```

When `stateKey` is provided:
- Current search, filters, sort, and pagination state is saved to URL
- Users can bookmark specific table states
- "Save view" and "Delete view" buttons appear in header
- Saved views are stored in localStorage
- Views can be quickly applied from dropdown

## FilterField Types

### Select Filter
```tsx
{
  key: 'status',
  label: 'Status',
  type: 'select',
  category: 'General',
  options: [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
  ]
}
```

### Multi-Select Filter
```tsx
{
  key: 'roles',
  label: 'Roles',
  type: 'multi-select',
  category: 'Permissions',
  options: roleOptions
}
```

### Date Range Filter
```tsx
{
  key: 'createdDate',
  label: 'Created Date',
  type: 'date-range',
  category: 'Timeline'
}
```

### Text Filter
```tsx
{
  key: 'description',
  label: 'Description',
  type: 'text',
  category: 'Content',
  operators: ['contains', 'startsWith', 'endsWith']
}
```

### Number Range Filter
```tsx
{
  key: 'age',
  label: 'Age',
  type: 'number-range',
  category: 'Demographics',
  min: 0,
  max: 100
}
```

## ActionButton Configuration

```tsx
interface ActionButton<T> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T, index: number) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: (item: T, index: number) => boolean;
  hidden?: (item: T, index: number) => boolean;
}

const actions: ActionButton<User>[] = [
  {
    label: 'Edit',
    icon: Edit,
    onClick: (user) => editUser(user),
    variant: 'secondary'
  },
  {
    label: 'Delete',
    icon: Trash2,
    onClick: (user) => deleteUser(user),
    variant: 'danger',
    disabled: (user) => user.role === 'admin'
  }
];
```

## Best Practices

### ✅ Do's

1. **Use server-side operations for large datasets**
   ```tsx
   // For datasets > 1000 items
   <AdvancedTable
     onDataLoad={handleServerLoad}
     pagination={{ serverSide: true, total: totalCount }}
   />
   ```

2. **Implement proper loading states**
   ```tsx
   <AdvancedTable
     loading={isLoading}
     data={data || []} // Prevent undefined errors
   />
   ```

3. **Use keyExtractor for consistent selection**
   ```tsx
   <AdvancedTable
     keyExtractor={(item) => item.id} // Unique, stable identifier
     selectable={true}
   />
   ```

4. **Implement search fields for better UX**
   ```tsx
   <AdvancedTable
     searchable={true}
     searchFields={['name', 'email', 'phone']} // Specific fields
   />
   ```

5. **Use state persistence for complex tables**
   ```tsx
   <AdvancedTable
     persistState={true}
     stateKey="unique-table-id"
   />
   ```

6. **Provide meaningful empty states**
   ```tsx
   <AdvancedTable
     emptyState={{
       icon: Users,
       title: 'No users found',
       description: 'Start by adding your first user.',
       action: { label: 'Add User', onClick: createUser }
     }}
   />
   ```

### ❌ Don'ts

1. **Don't use client-side operations for large datasets**
   ```tsx
   // ❌ Bad - will freeze browser
   <AdvancedTable
     data={largeDataset} // > 1000 items
     // No onDataLoad specified = client-side processing
   />
   ```

2. **Don't forget error handling**
   ```tsx
   // ❌ Bad - no error boundaries
   const { data } = api.getUsers.useQuery();
   <AdvancedTable data={data} />
   ```

3. **Don't use array index as keyExtractor**
   ```tsx
   // ❌ Bad - unstable keys cause selection issues
   keyExtractor={(item, index) => index}
   ```

4. **Don't overload with too many actions**
   ```tsx
   // ❌ Bad - too many actions crowd the UI
   actions={[edit, delete, duplicate, export, archive, approve, reject]}
   ```

5. **Don't mix server and client-side operations**
   ```tsx
   // ❌ Bad - conflicting configurations
   <AdvancedTable
     onDataLoad={serverLoad} // Server-side
     data={clientData}       // Client-side
     pagination={{ serverSide: false }} // Conflicting
   />
   ```

## Performance Considerations

1. **Memoize expensive renders**
   ```tsx
   const columns = useMemo(() => [
     {
       key: 'complex',
       render: (value, item) => <ComplexComponent data={item} />
     }
   ], []);
   ```

2. **Use callback functions for event handlers**
   ```tsx
   const handleSelectionChange = useCallback((selection) => {
     setSelectedRows(selection);
   }, []);
   ```

3. **Implement debounced search for server-side**
   ```tsx
   const debouncedDataLoad = useMemo(
     () => debounce(handleDataLoad, 300),
     []
   );
   ```

## Mobile Responsiveness

The table automatically handles mobile layouts:
- Switches to card-based layout on mobile
- Touch-friendly interactions
- Responsive pagination controls
- Mobile-optimized filter sidebar

## Troubleshooting

### Selection Not Working
- **Cause**: Missing or unstable `keyExtractor`
- **Fix**: Provide stable unique keys
  ```tsx
  keyExtractor={(item) => item.id}
  ```

### Performance Issues
- **Cause**: Large client-side datasets or complex renders
- **Fix**: Use server-side operations or memoization
  ```tsx
  onDataLoad={handleServerLoad}
  pagination={{ serverSide: true }}
  ```

### Filters Not Showing
- **Cause**: `filterable={false}` or empty `filters` array
- **Fix**: Enable filtering and provide filter configurations
  ```tsx
  filterable={true}
  filters={filterFields}
  ```

### State Not Persisting
- **Cause**: Missing `persistState` or `stateKey`
- **Fix**: Enable state persistence
  ```tsx
  persistState={true}
  stateKey="unique-table-identifier"
  ```

## Examples from Codebase

See these implementations for reference:
- `/src/app/[lang]/admin/events/page.tsx` - Basic table with search, selection, and modals
- `/src/app/[lang]/admin/users/page.tsx` - Server-side data loading with advanced filtering
- `/src/app/[lang]/captain/teams/[teamId]/players/invite/page.tsx` - Selection with dynamic header actions
- `/src/app/[lang]/volunteer/venues/[venueId]/teams/page.tsx` - Expandable rows with nested content
- `/src/app/[lang]/admin/venues/cluster-division-mapping/ClusterDivisionMappingTable.tsx` - Custom search fields and complex rendering

## Integration with Other Components

### With EnhancedModal
```tsx
// Use together for create/edit workflows
const [showModal, setShowModal] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);

<AdvancedTable
  onRowClick={(item) => {
    setSelectedItem(item);
    setShowModal(true);
  }}
  headerActions={
    <Button onClick={() => setShowModal(true)}>
      Create New
    </Button>
  }
/>

<EnhancedModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  // ... modal configuration
/>
```

### With Notification System
```tsx
import { useNotification } from '@/context/NotificationContext';

const { addNotification } = useNotification();

const handleBulkAction = async (selectedItems) => {
  try {
    await bulkDeleteMutation.mutateAsync(selectedItems);
    addNotification('Items deleted successfully', 'success');
  } catch (error) {
    addNotification('Failed to delete items', 'error');
  }
};
```