import { z } from "zod";

export const createFamilyWorkspaceSchema = z.object({
  familyName: z
    .string()
    .min(2, "Family name must be at least 2 characters")
    .max(50, "Family name must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9\s\-']+$/,
      "Family name can only contain letters, numbers, spaces, hyphens, and apostrophes"
    ),
});

export type CreateFamilyWorkspaceInput = z.infer<typeof createFamilyWorkspaceSchema>;

export const joinFamilySchema = z.object({
  code: z
    .string()
    .length(8, "Invite code must be 8 characters")
    .regex(/^[A-Z0-9]+$/, "Invalid invite code format"),
});

export type JoinFamilyInput = z.infer<typeof joinFamilySchema>;
