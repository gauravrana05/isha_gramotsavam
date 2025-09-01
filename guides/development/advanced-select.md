# AdvancedSelect Component Usage Guide

## Import Statement

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
```

## Basic Usage

```tsx
const [selectedValue, setSelectedValue] = useState<string>('');

<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

## With Dynamic Data

```tsx
const [selectedVenue, setSelectedVenue] = useState<string>('');

<Select value={selectedVenue} onValueChange={setSelectedVenue}>
  <SelectTrigger>
    <SelectValue placeholder="Select venue..." />
  </SelectTrigger>
  <SelectContent>
    {venues.map((venue) => (
      <SelectItem key={venue.id} value={venue.id}>
        {venue.name} - {venue.location}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## With Loading State

```tsx
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    {loading ? (
      <SelectItem value="loading" disabled>Loading...</SelectItem>
    ) : data?.length === 0 ? (
      <SelectItem value="no-data" disabled>No options available</SelectItem>
    ) : (
      data?.map((item) => (
        <SelectItem key={item.id} value={item.id}>
          {item.name}
        </SelectItem>
      ))
    )}
  </SelectContent>
</Select>
```

## With Disabled Options

```tsx
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="available">Available Option</SelectItem>
    <SelectItem value="disabled" disabled>Disabled Option</SelectItem>
  </SelectContent>
</Select>
```

## Key Props

- **Select**: Main container
  - `value`: Current selected value
  - `onValueChange`: Callback when selection changes
  
- **SelectTrigger**: The clickable trigger button
  
- **SelectValue**: Shows selected value or placeholder
  - `placeholder`: Text shown when no value selected
  
- **SelectContent**: Dropdown container for options
  
- **SelectItem**: Individual option
  - `value`: The value for this option
  - `disabled`: Makes option unselectable
  - `key`: Required for React lists

## Common Patterns

### State + District Selection
```tsx
const [selectedState, setSelectedState] = useState('');
const [selectedDistrict, setSelectedDistrict] = useState('');

// State selection
<Select value={selectedState} onValueChange={setSelectedState}>
  <SelectTrigger>
    <SelectValue placeholder="Select state" />
  </SelectTrigger>
  <SelectContent>
    {states.map((state) => (
      <SelectItem key={state} value={state}>
        {state}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// District selection (dependent on state)
<Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
  <SelectTrigger>
    <SelectValue placeholder="Select district" />
  </SelectTrigger>
  <SelectContent>
    {!selectedState ? (
      <SelectItem value="no-state" disabled>
        Select state first
      </SelectItem>
    ) : (
      districts.map((district) => (
        <SelectItem key={district} value={district}>
          {district}
        </SelectItem>
      ))
    )}
  </SelectContent>
</Select>
```

### With Form Labels
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Venue Selection *
  </label>
  <Select value={selectedVenue} onValueChange={setSelectedVenue}>
    <SelectTrigger>
      <SelectValue placeholder="Choose a venue..." />
    </SelectTrigger>
    <SelectContent>
      {venues.map((venue) => (
        <SelectItem key={venue.id} value={venue.id}>
          {venue.name} - {venue.district} ({venue.capacity} capacity)
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

## Important Notes

1. **Always use `key` prop** for dynamic SelectItem lists
2. **Handle loading states** to prevent empty dropdowns
3. **Use disabled items** for helpful messages (loading, no data, etc.)
4. **Value should be string** - convert other types if needed
5. **onValueChange receives the value**, not an event object
6. **Placeholder only shows** when no value is selected
