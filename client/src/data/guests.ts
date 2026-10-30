import type { SampleProfile } from '../types';

// "Try a sample profile" presets. Fictional people, no real personal data.
export const SAMPLE_PROFILES: readonly SampleProfile[] = [
  {
    id: 'sample-tile-owner',
    label: 'Tile plant owner, glazing and decoration',
    profile: {
      name: 'Rajesh Kumar',
      industry: 'Wall & floor tiles',
      jobRole: 'Owner & Managing Director',
      seniority: 'C-level / Owner',
      companySize: '51-200',
      region: 'West India',
      interests: ['Ceramic Glazing / Decorating / Surface Treatment', 'Digital Inks', 'Digital Printing & Technology'],
      freeText:
        'Upgrading our glaze line and moving to digital decoration. Need inks, a printer partner and a faster dryer.',
    },
  },
  {
    id: 'sample-sanitaryware-head',
    label: 'Sanitaryware plant head, kilns and fuel',
    profile: {
      name: 'Priya Nair',
      industry: 'Sanitaryware',
      jobRole: 'Head of Plant Operations',
      seniority: 'Director',
      companySize: '201-1000',
      region: 'South India',
      interests: ['Heat treatment / Refractories', 'Gasifiers/alternative fuel solutions', 'Dryers'],
      freeText: 'Cutting gas costs on our tunnel kilns. Looking for refractory supply and alternative fuel options.',
    },
  },
  {
    id: 'sample-technical-startup',
    label: 'Technical ceramics start-up, powders',
    profile: {
      name: 'Arjun Mehta',
      industry: 'Technical ceramics',
      jobRole: 'Co-founder & CTO',
      seniority: 'C-level / Owner',
      companySize: '11-50',
      region: 'South India',
      interests: ['Technical ceramics, components / services', 'Raw materials and additives', 'Crushing/Grinding/Milling'],
      freeText: 'Building alumina components in small batches. Need fine powders, milling equipment and shaping technology.',
    },
  },
];
