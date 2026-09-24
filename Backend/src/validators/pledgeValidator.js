import { z } from 'zod';

const allowedTitles = ['Mr.', 'Ms.', 'Mrs.', 'Adv.', 'Dr.', 'Other'];

export const pledgeSubmissionSchema = z.object({
  title: z
    .string()
    .trim()
    .refine((val) => allowedTitles.includes(val), {
      message: 'Invalid title. Must be one of: Mr., Ms., Mrs., Adv., Dr., Other',
    })
    .default('Mr.'),

  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must not exceed 120 characters'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(254, 'Email too long'),

  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length >= 10, {
      message: 'Please enter a valid 10-digit phone number',
    })
    .transform((val) => (val.length > 10 ? val.slice(-10) : val)),

  occupation: z
    .string()
    .trim()
    .max(100, 'Occupation must not exceed 100 characters')
    .optional()
    .default(''),

  organisation: z
    .string()
    .trim()
    .max(120, 'Organisation must not exceed 120 characters')
    .optional()
    .default(''),

  language: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val) => ['en', 'hi'].includes(val), {
      message: 'Language must be either en or hi',
    })
    .default('en'),

  pledgeAccepted: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Pledge acceptance is required to record the pledge',
    })
    .default(true),

  receiveCertificate: z.boolean().default(false),
});

/**
 * Pre-processes and normalizes raw frontend request payload before schema validation.
 */
export function normalizePledgePayload(rawBody = {}) {
  const name = (rawBody.name || rawBody.officialName || '').trim();
  const phone = (rawBody.phone || rawBody.mobile || '').trim();
  const occupation = (rawBody.occupation || rawBody.profession || '').trim();
  const organisation = (rawBody.organisation || rawBody.organization || '').trim();
  
  const receiveCert = Boolean(
    rawBody.receiveCertificate ?? rawBody.certificateConsent ?? false
  );

  const pledgeAccepted = Boolean(
    rawBody.pledgeAccepted ?? rawBody.certificateConsent ?? true
  );

  return {
    title: (rawBody.title || 'Mr.').trim(),
    name,
    email: (rawBody.email || '').trim().toLowerCase(),
    phone,
    occupation,
    organisation,
    language: (rawBody.language || 'en').trim().toLowerCase(),
    pledgeAccepted,
    receiveCertificate: receiveCert,
  };
}

export function validatePledgeInput(rawBody) {
  const normalized = normalizePledgePayload(rawBody);
  return pledgeSubmissionSchema.parse(normalized);
}

export default {
  pledgeSubmissionSchema,
  normalizePledgePayload,
  validatePledgeInput,
};
