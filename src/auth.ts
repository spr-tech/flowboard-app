import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),

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

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});


// NextAuth
//    the main function from the next-auth library that sets up
//    everything authentication related in one place. it returns
//    four things we export and use across the app.
//
// handlers
//    the GET and POST functions that power the /api/auth routes.
//    when the browser sends a login or logout request, these
//    handle it automatically without us writing any route logic.
//
// signIn / signOut
//    functions we call in our components to trigger login and logout.
//
// auth
//    the function we call anywhere in the app to get the current
//    session. returns the logged in user or null if nobody is logged in.
//
// ...authConfig
//    spreads in the lightweight config from auth.config.ts.
//    that file holds the route protection rules and is kept
//    separate because middleware runs on the edge runtime which
//    cannot use Prisma or bcrypt. this file adds the heavy stuff
//    on top of that base config.
//
// providers
//    the list of ways a user can log in.
//    GitHub handles the OAuth flow entirely on their end.
//    Credentials handles email and password login manually.
//
// authorize
//    runs when a user submits the login form.
//    looks the user up in the database by email, compares the
//    typed password against the bcrypt hash stored in the database,
//    and returns the user object if everything matches or null if not.
//    returning null tells Auth.js the login failed.
//
// callbacks
//    functions Auth.js calls automatically at key points in the
//    auth flow. we use them to pass the database id into the session
//    because Auth.js does not include it by default.
//
// jwt callback
//    runs when a session token is first created at login.
//    the user object returned from authorize is available here.
//    we grab the database id and attach it to the token before
//    it gets encrypted and stored as a cookie in the browser.
//    on future requests this callback still runs but user is
//    undefined, so the if check protects against overwriting.
//
// what is a JWT token
//    a small encrypted package stored as a cookie in the browser.
//    it holds information about the logged in user so the server
//    can identify who is making each request without hitting the
//    database every time. JWT stands for JSON Web Token.
//
// session callback
//    runs every time auth() is called anywhere in the app.
//    takes the id we stored in the token and copies it onto
//    session.user.id so our app code can actually read it.
//    without this callback the id sits in the token but never
//    reaches the session object our code works with.
//
// pages
//    overrides Auth.js defaults. tells it to use our custom
//    /login page instead of its own built in login screen.