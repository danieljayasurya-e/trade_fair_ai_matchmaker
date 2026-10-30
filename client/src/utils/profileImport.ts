import { COMPANY_SIZES, INDUSTRIES, INTERESTS, REGIONS, SENIORITIES } from '../data/taxonomy';
import type { GuestFormValues } from './guestForm';

// Upload fills the details form instead of skipping it: values we recognise are filled in,
// anything else is left blank for the visitor to pick. The field names are the mobile
// app's GuestInput names, so a profile exported from there loads as-is.

export const EXAMPLE_PROFILE_JSON = JSON.stringify(
  {
    name: 'Example visitor',
    industry: 'Manufacturing',
    jobRole: 'Plant Manager',
    seniority: 'Manager',
    companySize: '201-1000',
    region: 'West India',
    interests: ['Industrial Automation', 'Predictive Maintenance', 'IoT Sensors'],
    freeText: 'Retrofitting two assembly lines and looking for condition-monitoring sensors.',
  },
  null,
  2,
);

export type ParseResult = { ok: true; values: Partial<GuestFormValues>; filled: number } | { ok: false; error: string };

// Hyphen, en dash and minus all spell the same range, so "51–200" matches "51-200".
const normalise = (value: string) => value.trim().toLowerCase().replace(/[‐-―−]/g, '-');

function pick<T extends string>(options: readonly T[], value: string | undefined): T | undefined {
  if (!value) return undefined;
  const wanted = normalise(value);
  return options.find((option) => normalise(option) === wanted);
}

interface RawFields {
  name?: string;
  jobRole?: string;
  industry?: string;
  seniority?: string;
  companySize?: string;
  region?: string;
  interests?: string[];
  freeText?: string;
}

function toValues(raw: RawFields): ParseResult {
  const interests = [
    ...new Set((raw.interests ?? []).flatMap((entry) => pick(INTERESTS, entry) ?? [])),
  ];
  const values: Partial<GuestFormValues> = {
    name: raw.name?.trim(),
    jobRole: raw.jobRole?.trim(),
    industry: pick(INDUSTRIES, raw.industry),
    seniority: pick(SENIORITIES, raw.seniority),
    companySize: pick(COMPANY_SIZES, raw.companySize),
    region: pick(REGIONS, raw.region),
    interests: interests.length > 0 ? interests : undefined,
    freeText: raw.freeText?.trim(),
  };
  // Drop empty entries so they don't overwrite what is already in the form.
  const filledEntries = Object.entries(values).filter(([, value]) => value !== undefined && value !== '');
  if (filledEntries.length === 0) {
    return {
      ok: false,
      error: 'No profile fields found. Use names such as “industry”, “jobRole” and “interests”.',
    };
  }
  return { ok: true, values: Object.fromEntries(filledEntries) as Partial<GuestFormValues>, filled: filledEntries.length };
}

/** Splits one CSV line, honouring double-quoted cells. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

const asText = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** Reads a JSON object or a one-row CSV (interests separated by ; or |). */
export function parseProfileText(text: string, filename = ''): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'The file is empty.' };

  const isCsv = filename.toLowerCase().endsWith('.csv') || !trimmed.startsWith('{');
  try {
    if (!isCsv) {
      const data: unknown = JSON.parse(trimmed);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return { ok: false, error: 'Expected one profile object.' };
      }
      const record = data as Record<string, unknown>;
      const interests = Array.isArray(record.interests)
        ? record.interests.filter((value): value is string => typeof value === 'string')
        : typeof record.interests === 'string'
          ? record.interests.split(/[;|]/)
          : [];
      return toValues({
        name: asText(record.name),
        jobRole: asText(record.jobRole) ?? asText(record.role),
        industry: asText(record.industry),
        seniority: asText(record.seniority),
        companySize: asText(record.companySize),
        region: asText(record.region),
        interests,
        freeText: asText(record.freeText),
      });
    }

    const [headerLine, rowLine] = trimmed.split(/\r?\n/);
    if (!headerLine || !rowLine) return { ok: false, error: 'The CSV needs a header row and one profile row.' };
    const headers = splitCsvLine(headerLine).map((header) => header.toLowerCase());
    const cells = splitCsvLine(rowLine);
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const index = headers.indexOf(key);
        if (index >= 0) return cells[index];
      }
      return undefined;
    };
    return toValues({
      name: get('name'),
      jobRole: get('jobrole', 'role'),
      industry: get('industry'),
      seniority: get('seniority'),
      companySize: get('companysize', 'size'),
      region: get('region'),
      interests: (get('interests') ?? '').split(/[;|]/),
      freeText: get('freetext'),
    });
  } catch {
    return { ok: false, error: 'That file could not be read. Check it is valid JSON or CSV.' };
  }
}
