// Route protection on the Edge. The rules are in authConfig.callbacks.authorized (src/auth.config.ts).
import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Only the pages the rules cover, so the landing page and the API skip middleware entirely.
  // "/dashboard/:path*" matches /dashboard itself as well as everything under it.
  matcher: ["/dashboard/:path*", "/projects/:path*", "/settings/:path*", "/login", "/register", "/forgot-password"],
};
