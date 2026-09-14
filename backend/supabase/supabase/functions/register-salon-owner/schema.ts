import { z } from "zod";

export const registerSalonOwnerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  locale: z.enum(["en", "nl", "fr", "pt"]).default("en"),
  emailRedirectTo: z.string().url("Invalid redirect URL"),
  company: z.object({
    name: z.string().min(1, "Company name is required"),
    email: z.string().email("Invalid company email").optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }),
});

export type RegisterSalonOwnerInput = z.infer<typeof registerSalonOwnerSchema>;
