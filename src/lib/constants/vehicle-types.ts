export const VEHICLE_TYPES = [
  { value: 'CAR', label: 'Car' },
  { value: 'BIKE', label: 'Bike' },
  { value: 'BOAT', label: 'Boat' },
  { value: 'PLANE', label: 'Plane' },
  { value: 'JET_SKI', label: 'Jet Ski' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'MOTORBIKE', label: 'Motorbike' },
  { value: 'RACING_CAR', label: 'Racing Car' },
] as const;

export const VEHICLE_CONDITIONS = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
] as const;

export const COLORS = [
  'Black', 'White', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow',
  'Orange', 'Brown', 'Beige', 'Gold', 'Bronze', 'Maroon', 'Navy',
  'Teal', 'Purple', 'Pink', 'Other',
] as const;
