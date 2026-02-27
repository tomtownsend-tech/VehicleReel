export const LOCATIONS = [
  'Cape Town',
  'Johannesburg',
  'Pretoria',
  'Durban',
  'Port Elizabeth (Gqeberha)',
  'Bloemfontein',
  'East London',
  'Stellenbosch',
  'Paarl',
  'Knysna',
  'George',
] as const;

export type Location = typeof LOCATIONS[number];
