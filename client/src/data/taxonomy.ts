// Controlled vocabularies shared by guests, exhibitors, filters and the scorer. These are the values
// served by GET /api/meta (docs/api-contract.md, section 8); keep the two in step.
// `as const` tuples let TypeScript catch typos in the data.

// Product areas at LASER World of PHOTONICS INDIA. Visitors pick what they want to buy; exhibitors
// are tagged from their own product lists (data/retag_exhibitors.py), so one vocabulary serves
// both sides and every "Matched on" reason is a real product area.
export const INTERESTS = [
  'Laser Sources',
  'Laser Cutting & Welding',
  'Laser Marking & Engraving',
  'Laser Cleaning',
  'Additive Manufacturing',
  'Scanners & Beam Delivery',
  'Controllers & Software',
  'Optical Components',
  'Optical Coatings & Thin Film',
  'Optical Materials & Crystals',
  'Fibre Optics',
  'Metrology & Test',
  'Beam Profiling & Power Meters',
  'Spectroscopy & Analytical',
  'Imaging & Machine Vision',
  'Sensors & Detectors',
  'Motion & Positioning',
  'Opto-Mechanics',
  'Vacuum & Semiconductor Equipment',
  'Quantum Technologies',
  'Laser Safety',
  'Cooling & Chillers',
  'Media & Associations',
] as const;
export type Interest = (typeof INTERESTS)[number];

// The visitor's sector. Exhibitors list the same sectors as the ones they sell to.
export const INDUSTRIES = [
  'Metal Fabrication & Manufacturing',
  'Automotive & EV',
  'Aerospace & Defence',
  'Electronics & Semiconductors',
  'Medical & Life Sciences',
  'Research & Academia',
  'Telecom & Data Communications',
  'Energy & Solar',
  'Trading & Distribution',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const SENIORITIES = ['Individual Contributor', 'Manager', 'Senior Manager', 'Director', 'C-level / Owner'] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const REGIONS = [
  'North India',
  'South India',
  'East India',
  'West India',
  'Middle East',
  'Europe',
  'Southeast Asia',
] as const;
export type Region = (typeof REGIONS)[number];

// The whole show is in Hall 1. The contract's `hall` field carries the booth row: booth codes start
// with one of these (LA is the west wall, LF the east wall).
export const HALLS = ['LA', 'LB', 'LC', 'LD', 'LE', 'LF'] as const;
export type Hall = (typeof HALLS)[number];

/** Product areas read in full everywhere, so this only keeps call sites simple. */
export const segmentLabel = (label: string): string => label;
