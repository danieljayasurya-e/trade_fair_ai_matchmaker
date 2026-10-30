// Prints the GET /api/meta body, so the frontend's vocabularies stay the backend's only source.
import { SAMPLE_PROFILES } from '../src/data/guests';
import { COMPANY_SIZES, HALLS, INDUSTRIES, INTERESTS, REGIONS, SENIORITIES } from '../src/data/taxonomy';

console.log(
  JSON.stringify(
    {
      industries: INDUSTRIES,
      seniorities: SENIORITIES,
      companySizes: COMPANY_SIZES,
      regions: REGIONS,
      halls: HALLS,
      taxonomy: INTERESTS,
      sampleProfiles: SAMPLE_PROFILES,
    },
    null,
    2,
  ),
);
