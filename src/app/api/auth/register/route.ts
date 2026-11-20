import { registerSchema } from "@/models/validations/authValidation";
import { register } from "@/server/auth/auth.service";
import { route } from "@/server/lib/route";

/** Create an email + password account. 201 with the user; 409 if the email is taken. */
export const POST = route({ auth: false, body: registerSchema, status: 201 }, ({ body: { name, email, password } }) =>
  register({ name, email, password }),
);
