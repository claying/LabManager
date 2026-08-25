import { z } from "zod";

// Every form dialog pre-populates these fields with `null` (matching the
// nullable DB columns) when there's no existing value, not `undefined` — so
// each of these must accept `null` as valid input, not just `""`/undefined,
// or submitting a form with the field left untouched fails validation.

export const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(2048)
  .nullable()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const optionalDate = z
  .string()
  .trim()
  .nullable()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const optionalText = z
  .string()
  .trim()
  .max(20000)
  .nullable()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

/** Same shape as optionalText, for the many short-text fields with their own max length. */
export function optionalTextMax(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));
}

export const optionalEmail = z
  .string()
  .trim()
  .email("Must be a valid email")
  .nullable()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));
