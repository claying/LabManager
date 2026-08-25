import { z } from "zod";
import { GRANT_STATUSES } from "@pi-os/types";
import { optionalDate, optionalText, optionalTextMax } from "./common";

export const grantSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(400),
  funder: optionalTextMax(200),
  program: optionalTextMax(200),
  status: z.enum(GRANT_STATUSES),
  deadline: optionalDate,
  start_date: optionalDate,
  end_date: optionalDate,
  amount: z.coerce.number().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).default("USD"),
  pi_person_id: z.string().uuid().nullable().optional(),
  description: optionalText,
  notes: optionalText,
});
export type GrantInput = z.infer<typeof grantSchema>;
