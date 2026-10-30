import type { CompanySize, Industry, Interest, Region, Seniority } from '../data/taxonomy';
import type { Guest, GuestInput } from '../types';

// Same limits and messages as the mobile app's guestInputSchema.
export const NAME_MAX = 80;
export const FREE_TEXT_MAX = 1000;

/** Form state: single-choice fields are empty until the visitor picks one. */
export interface GuestFormValues {
  name: string;
  industry: Industry | '';
  jobRole: string;
  seniority: Seniority | '';
  companySize: CompanySize | '';
  region: Region | '';
  interests: Interest[];
  freeText: string;
}

export type FieldName = keyof GuestFormValues;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const EMPTY_FORM: GuestFormValues = {
  name: '',
  industry: '',
  jobRole: '',
  seniority: '',
  companySize: '',
  region: '',
  interests: [],
  freeText: '',
};

/** Fields in the order they appear on screen, so the first error can take focus. */
export const FIELD_ORDER: readonly FieldName[] = [
  'name',
  'jobRole',
  'industry',
  'seniority',
  'companySize',
  'region',
  'interests',
  'freeText',
];

export function formFromGuest(guest: GuestInput): GuestFormValues {
  const { name, industry, jobRole, seniority, companySize, region, interests, freeText } = guest;
  return { name, industry, jobRole, seniority, companySize, region, interests: [...interests], freeText };
}

export type ValidationResult = { ok: true; input: GuestInput } | { ok: false; errors: FieldErrors };

export function validateGuestForm(values: GuestFormValues): ValidationResult {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const jobRole = values.jobRole.trim();

  if (!name) errors.name = 'Please enter your name';
  else if (name.length > NAME_MAX) errors.name = `Keep it under ${NAME_MAX} characters`;
  if (!jobRole) errors.jobRole = 'Enter your job role';
  else if (jobRole.length > NAME_MAX) errors.jobRole = `Keep it under ${NAME_MAX} characters`;
  if (!values.industry) errors.industry = 'Pick your industry';
  if (!values.seniority) errors.seniority = 'Pick your seniority';
  if (!values.companySize) errors.companySize = 'Pick your company size';
  if (!values.region) errors.region = 'Pick your region';
  if (values.interests.length === 0) errors.interests = 'Pick at least one interest';
  if (values.freeText.length > FREE_TEXT_MAX) errors.freeText = `Keep it under ${FREE_TEXT_MAX} characters`;

  const { industry, seniority, companySize, region } = values;
  if (Object.keys(errors).length > 0 || !industry || !seniority || !companySize || !region) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    input: { name, industry, jobRole, seniority, companySize, region, interests: values.interests, freeText: values.freeText },
  };
}

/** A new id per person keeps one visitor's saved stalls from showing up for the next. */
export const newGuestId = () => `g-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const toGuest = (input: GuestInput, id: string = newGuestId()): Guest => ({
  id,
  updatedAt: new Date().toISOString(),
  ...input,
});
