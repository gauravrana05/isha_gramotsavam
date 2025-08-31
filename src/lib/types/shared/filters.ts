// Filter and search types
export interface ActiveFilter {
  key: string;
  label: string;
  value: any;
  // No status or district properties based on errors
}

export interface TalukMappingData {
  id: string;
  taluk: string;
  eventName: string;
  // clusterVenueMapping should be accessed via function, not string
  clusterVenueMapping: {
    venueName: string;
  };
}
