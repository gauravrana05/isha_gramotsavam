# Multi-Select Edit Modal Implementation Guide

## Issue Analysis
The cluster-division mapping edit modal is not properly populating form values, while location mapping works correctly.

## Location Mapping Success Pattern

### 1. State Initialization (CRITICAL DIFFERENCE)
```javascript
// ✅ LOCATION MAPPING - Initialize with mapping data directly
const [selectedState, setSelectedState] = useState<string>(mapping.state || '');
const [selectedVenue, setSelectedVenue] = useState<string>(mapping.venueLocationMapping.venue.id || '');
const [selectedLocations, setSelectedLocations] = useState<string[]>([mapping.locationName]);
```

### 2. Data Query with Conditional Enable
```javascript
// ✅ LOCATION MAPPING - Only query when edit mode is active
const { data: allMappingsData } = api.admin.mappings.getLocationClusterMappings.useQuery({
  eventId: selectedEvent,
}, {
  enabled: !!selectedEvent && isEditMode, // KEY: Only enabled in edit mode
});
```

### 3. Related Items Update (After Initial State)
```javascript
// ✅ LOCATION MAPPING - Updates related items AFTER initial state is set
useEffect(() => {
  if (allMappingsData && isEditMode) {
    const relatedLocations = allMappingsData
      .filter(m => 
        m.venueLocationMapping.venue.id === mapping.venueLocationMapping.venue.id &&
        m.locationType === mapping.locationType && 
        m.state === mapping.state
      )
      .map(m => m.locationName);
    
    if (relatedLocations.length > 0) {
      setSelectedLocations(relatedLocations);
    }
  }
}, [allMappingsData, isEditMode, mapping]);
```

### 4. Form Reset (Separate useEffect)
```javascript
// ✅ LOCATION MAPPING - Separate useEffect for form reset
useEffect(() => {
  if (isEditMode) {
    setLocationType(mapping.locationType);
    setSelectedState(mapping.state || '');
    setSelectedDistrict(mapping.district || '');
    setSelectedVenue(mapping.venueLocationMapping.venue.id || '');
  }
}, [isEditMode, mapping]);
```

## Current Cluster-Division Issues

### 1. Wrong State Initialization
```javascript
// ❌ CLUSTER-DIVISION - Empty initial state
const [selectedState, setSelectedState] = useState<string>('');
const [selectedDivisionVenue, setSelectedDivisionVenue] = useState<string>('');
const [selectedClusterVenues, setSelectedClusterVenues] = useState<string[]>([]);
```

### 2. Data Query Always Enabled
```javascript
// ❌ CLUSTER-DIVISION - Always queries data
const { data: allMappingsData } = api.admin.mappings.getClusterDivisionMappings.useQuery({
  eventId: selectedEvent,
}, {
  enabled: !!selectedEvent, // Missing isEditMode condition
});
```

### 3. useEffect Order Issues
```javascript
// ❌ CLUSTER-DIVISION - Multiple useEffects fighting each other
// First useEffect sets values
// Second useEffect immediately overrides them
```

## Fix Implementation

### Step 1: Fix State Initialization
```javascript
// ✅ Initialize with mapping data directly
const [selectedState, setSelectedState] = useState<string>(
  mapping?.divisionVenueMapping?.venue?.state || ''
);
const [selectedDivisionVenue, setSelectedDivisionVenue] = useState<string>(
  mapping?.divisionVenueMappingId || ''
);
const [selectedClusterVenues, setSelectedClusterVenues] = useState<string[]>(
  mapping?.clusterVenueMappingId ? [mapping.clusterVenueMappingId] : []
);
```

### Step 2: Fix Data Query
```javascript
// ✅ Only query when in edit mode
const { data: allMappingsData } = api.admin.mappings.getClusterDivisionMappings.useQuery({
  eventId: selectedEvent,
}, {
  enabled: !!selectedEvent && isEditMode, // Add isEditMode condition
});
```

### Step 3: Fix useEffect Order
```javascript
// ✅ Single useEffect for related clusters (after initial state is set)
useEffect(() => {
  if (allMappingsData && isEditMode && mapping) {
    const relatedClusters = allMappingsData
      .filter(m => m.divisionVenueMappingId === mapping.divisionVenueMappingId)
      .map(m => m.clusterVenueMappingId)
      .filter(Boolean);
    
    if (relatedClusters.length > 0) {
      setSelectedClusterVenues(relatedClusters);
    }
  }
}, [allMappingsData, isEditMode, mapping]);

// ✅ Remove the separate form reset useEffect - not needed with proper initialization
```

### Step 4: Component Props Pattern
```javascript
// ✅ Pass mapping data to component
<EditClusterDivisionMappingModal
  isOpen={showEditModal}
  onClose={() => setShowEditModal(false)}
  mapping={selectedMapping} // Ensure this has all nested data
  selectedEvent={selectedEvent}
  onSuccess={() => {
    refetchMappings();
    setShowEditModal(false);
  }}
/>
```

## Key Differences Summary

| Aspect | Location Mapping (✅ Works) | Cluster-Division (❌ Broken) |
|--------|---------------------------|------------------------------|
| State Init | `useState(mapping.state)` | `useState('')` |
| Data Query | `enabled: isEditMode` | `enabled: true` |
| useEffect | Single, after init | Multiple, conflicting |
| Form Reset | Separate useEffect | Mixed with init |

## Implementation Priority

1. **CRITICAL**: Fix state initialization with mapping data
2. **HIGH**: Add isEditMode to data query enabled condition  
3. **MEDIUM**: Consolidate useEffects to prevent conflicts
4. **LOW**: Remove unnecessary form reset useEffect

This pattern ensures form values are available immediately when the component renders, preventing the "empty select" issue.
