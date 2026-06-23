import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

// ─── IMPORTS ───────────────────────────────────────────────────────
// auth         — imported from my auth.ts file. Wraps the middleware function
//                so that Auth.js automatically attaches the current user session
//                to req.auth before our code runs

// NextResponse — built-in Next.js tool that lets us control what happens
//                with an incoming request. We can either redirect the user
//                somewhere else or let the request continue normally

// ─── MIDDLEWARE FUNCTION ───────────────────────────────────────────
// auth((req) => {...})
//              — req is the incoming request object. It contains everything
//                about what the user is trying to do — the URL they want,
//                their session, their cookies etc.

// !!req.auth   — req.auth contains the session object if the user is logged in,
//                or null if they are not. The !! converts it to a true/false value.
//                true means logged in, false means not logged in

// req.nextUrl.pathname
//              — req.nextUrl is the full URL the user is trying to visit
//                .pathname extracts just the path part of that URL
//                for example: if they visit /dashboard/projects
//                req.nextUrl.pathname would be "/dashboard/projects"

// .startsWith("/dashboard")
//              — checks if the pathname begins with "/dashboard"
//                returns true for /dashboard, /dashboard/projects, /dashboard/settings
//                returns false for /login, /register, / (homepage)

// isDashboard  — true if the user is trying to visit any dashboard page
// isLoggedIn   — true if the user has an active session, false if not

// ─── PROTECTION LOGIC ─────────────────────────────────────────────
// if (isDashboard && !isLoggedIn)
//              — if the user is trying to visit a dashboard page AND
//                they are not logged in, we block them

// NextResponse.redirect(new URL("/login", req.url))
//              — redirect sends the user to a different URL instead of
//                letting them reach the page they wanted
//                new URL("/login", req.url) builds the full login URL
//                using the current request URL as the base
//                for example: https://flowboard.com/login

// ─── LET REQUEST THROUGH ──────────────────────────────────────────
// NextResponse.next()
//              — if the user passed all checks, .next() means
//                "everything is fine, let this request continue normally"
//                the user reaches the page they were trying to visit

// ─── CONFIG ───────────────────────────────────────────────────────
// config.matcher
//              — tells Next.js which URLs this middleware should run on
//                the pattern means: run on every URL in the app EXCEPT
//                /api routes — these handle their own logic
//                /_next/static — Next.js static assets like JS and CSS files
//                /_next/image — Next.js image optimization files
//                /favicon.ico — the browser tab icon
//                we exclude these because they don't need authentication checks
//new URL(path, base)

//What new URL does:

//It takes the domain only from req.url and replaces the entire path with /login:
//Takes this    → https://flowboard.vercel.app/dashboard/projects
//Extracts this → https://flowboard.vercel.app
//Adds this     → /login
//Result        → https://flowboard.vercel.app/login
