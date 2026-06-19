import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        return null;
      },
    }),
  ],
});


// auth.ts — Central authentication configuration for the app
// Auth.js reads this file to know how login, logout and sessions work
//provider - the list of ways users can log in

// handlers — processes incoming login/logout API requests behind the scenes
// signIn  — function you call to log a user in
// signOut — function you call to log a user out
// auth    — function you call anywhere to check who is currently logged in
// Credentials — the email/password login provider. the login method , 
// credentials — defines the input fields needed for login  method(email and password)
// authorize — the security guard that checks if the email and password are correct
//             returns the user object if valid, returns null if invalid