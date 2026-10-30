// Controlled vocabularies shared by guests, exhibitors, filters and the scorer.
// `as const` tuples let TypeScript catch typos in the data.

// The exhibitor segments are exactly the "Segment / Business Category" values in the Indian
// Ceramics Asia company list. Visitors pick the ones they want to buy, so one vocabulary
// serves both sides and every "Matched on" reason is a real segment.
export const INTERESTS = [
  'Ceramic Glazing / Decorating / Surface Treatment',
  'Heat treatment / Refractories',
  'Raw materials and additives',
  'Materials and aids',
  'Form/Shaping',
  'Technical ceramics, components / services',
  'Plant construction engineering',
  'Digital Inks',
  'Handling / Packaging / Automation',
  'Gasifiers/alternative fuel solutions',
  'Digital Printing & Technology',
  'Ceramic machine Tools / Spares / Replacement Parts',
  'Crushing/Grinding/Milling',
  'Lubricants',
  'Dryers',
] as const;
export type Interest = (typeof INTERESTS)[number];

// What kind of ceramics business the visitor runs.
// TODO: confirm this list with the organiser; the company list does not define visitor sectors.
export const INDUSTRIES = [
  'Wall & floor tiles',
  'Sanitaryware',
  'Tableware & giftware',
  'Technical ceramics',
  'Refractories',
  'Bricks & roofing',
  'Trading & distribution',
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

export const HALLS = ['1', '2', '3', '4'] as const;
export type Hall = (typeof HALLS)[number];

/** Which region of India an exhibitor's state falls in, for the location half of "buyer fit". */
export const REGION_OF_STATE: Readonly<Record<string, Region>> = {
  Gujarat: 'West India',
  Maharashtra: 'West India',
  Rajasthan: 'North India',
  Delhi: 'North India',
  'Uttar Pradesh': 'North India',
  Telangana: 'South India',
  'Tamil Nadu': 'South India',
  Karnataka: 'South India',
  'West Bengal': 'East India',
};

/**
 * Which visitor sectors buy each segment. One rule per segment, applied to every exhibitor in it
 * alike, so no company is favoured. It stands in for the "target buyer" data the company list lacks.
 * TODO: replace with the organiser's buyer criteria when available.
 */
const MAKERS: readonly Industry[] = ['Wall & floor tiles', 'Sanitaryware', 'Tableware & giftware'];
const HEAVY_CLAY: readonly Industry[] = [...MAKERS, 'Bricks & roofing'];
const ALL_MAKERS: readonly Industry[] = [...MAKERS, 'Technical ceramics', 'Refractories', 'Bricks & roofing'];

export const INDUSTRIES_BUYING: Readonly<Record<Interest, readonly Industry[]>> = {
  'Ceramic Glazing / Decorating / Surface Treatment': MAKERS,
  'Heat treatment / Refractories': ALL_MAKERS,
  'Raw materials and additives': [...ALL_MAKERS, 'Trading & distribution'],
  'Materials and aids': [...ALL_MAKERS, 'Trading & distribution'],
  'Form/Shaping': [...HEAVY_CLAY, 'Technical ceramics'],
  'Technical ceramics, components / services': ['Technical ceramics', 'Refractories'],
  'Plant construction engineering': [...HEAVY_CLAY, 'Refractories'],
  'Digital Inks': MAKERS,
  'Handling / Packaging / Automation': [...HEAVY_CLAY, 'Trading & distribution'],
  'Gasifiers/alternative fuel solutions': [...HEAVY_CLAY, 'Refractories'],
  'Digital Printing & Technology': MAKERS,
  'Ceramic machine Tools / Spares / Replacement Parts': [...HEAVY_CLAY, 'Technical ceramics'],
  'Crushing/Grinding/Milling': [...HEAVY_CLAY, 'Technical ceramics', 'Refractories'],
  Lubricants: ALL_MAKERS,
  Dryers: [...HEAVY_CLAY, 'Technical ceramics'],
};
