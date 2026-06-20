import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(3, "Name must be atleast 3 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be atleast 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
