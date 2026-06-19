import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        //checks if the email or password is provided
        if (!credentials?.email || !credentials?.password) return null;

        //find the user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email as string },
        });

        //user not found , reject login
        if (!user || !user.password) return null;

        //comparing the password typed with the hashed version in the databse
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return user;
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },
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
