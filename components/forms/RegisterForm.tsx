"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormValues } from "@/lib/validations/auth";
import { registerNewUser } from "@/app/actions/auth";
import { Eye, EyeOff } from "lucide-react";

import Image from "next/image";

// Defined OUTSIDE the component — created once, not re-created on every render
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path
      //   fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);

    const result = await registerNewUser({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong");
      return;
    }

    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4 py-10">
      {/* Logo and subtext */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="flex flex-col items-center gap-2 mb-3">
            <Image
              src="/flowboard logo.svg"
              alt="FlowBoard"
              width={50}
              height={50}
            />
          </div>
        </div>
        <p className="text-slate-600 text-2xl font-semibold">
          Create your free account
        </p>
      </div>

      {/* Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-7 w-full max-w-md">
        {/* Google OAuth button */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-[#E5E7EB] rounded-lg py-2.5 text-sm text-[#111827] mb-2 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
        >
          <GoogleIcon />
          Sign up with Google
        </button>

        {/* GitHub OAuth button */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-[#E5E7EB] rounded-lg py-2.5 text-sm text-[#111827] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#111827">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Sign up with GitHub
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#E5E7EB]"></div>
          <span className="text-xs text-[#6B7280]">or sign up with email</span>
          <div className="flex-1 h-px bg-[#E5E7EB]"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Full name */}
          <div className="mb-3">
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              {...register("name")}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-colors"
            />
            {errors.name && (
              <p className="text-xs text-[#EF4444] mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-3">
            <input
              id="email"
              type="email"
              placeholder="Enter your email address"
              {...register("email")}
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 transition-colors"
            />
            {errors.email && (
              <p className="text-xs text-[#EF4444] mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-3">
            <div className=" flex justify-between items-center  w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/10 transition-colors">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                {...register("password")}
                className="border-0 outline-0 flex-1"
              />

              <button
                onClick={handleShowPassword}
                className="hover:cursor-pointer"
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="text-slate-700" size={15} />
                ) : (
                  <Eye className="text-slate-700" size={15} />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[#EF4444] mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="mb-3">
            <div className=" flex justify-between items-center  w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/10 transition-colors">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="confirm password"
                {...register("confirmPassword")}
                className="border-0 outline-0 flex-1"
              />
              <button
                onClick={handleShowPassword}
                className="hover:cursor-pointer"
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="text-slate-700" size={15} />
                ) : (
                  <Eye className="text-slate-700" size={15} />
                )}
              </button>

              {errors.confirmPassword && (
                <p className="text-xs text-[#EF4444] mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">
            By creating an account you agree to our{" "}
            <span className="text-[#7C3AED] cursor-pointer">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-[#7C3AED] cursor-pointer">
              Privacy Policy
            </span>
            .
          </p>

          {/* Server error */}
          {serverError && (
            <p className="text-xs text-[#EF4444] mb-3 text-center">
              {serverError}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          {/* Sign in link */}
          <p className="text-center text-xs text-[#6B7280] mt-4">
            Already have an account?{" "}
            <span
              className="text-[#7C3AED] font-semibold cursor-pointer hover:underline"
              onClick={() => router.push("/login")}
            >
              Sign in
            </span>
          </p>
        </form>
      </div>
    </main>
  );
}

// ─── ROUTER ─────────────────────────────────────────────────────────────────
// useRouter()
//    — a Next.js hook that gives you a "router" object
//    — lets you send the user to a different page programmatically,
//      without them clicking a normal <a> link
//    — we use router.push("/login") later to send them to the login page
//      after they successfully register

// ─── SERVER ERROR STATE ─────────────────────────────────────────────────────
// useState<string | null>(null)
//    — creates a piece of state called serverError, starting as null
//    — string | null means it can either hold an error message (a string)
//      or hold nothing at all (null)
//    — setServerError is the function we call to UPDATE that state
//    — this state exists because errors from the SERVER (like "email already
//      taken") are different from errors caught by Zod on the FRONTEND
//      (like "password too short") — those show under each input automatically,
//      but server errors need their own place to be displayed

// ─── USEFORM HOOK ───────────────────────────────────────────────────────────
// useForm<RegisterFormValues>({...})
//    — comes from react-hook-form, the library that manages your entire form
//    — <RegisterFormValues> tells TypeScript exactly what shape the form data
//      will be: { name, email, password, confirmPassword }
//      this is the type we generated earlier from registerSchema using
//      z.infer<typeof registerSchema>
//
// resolver: zodResolver(registerSchema)
//    — connects react-hook-form to Zod
//    — every time the form is submitted, Zod checks the typed values against
//      registerSchema's rules (name min 3 chars, valid email, password min 8
//      chars, passwords must match)
//    — if any rule fails, react-hook-form automatically fills the `errors`
//      object below — we never have to write that validation logic ourselves
//
// register
//    — a function you spread onto each <input> like {...register("email")}
//    — it wires that specific input up to react-hook-form so it can track
//      what the user types, without us needing onChange or useState
//      for every single field
//
// handleSubmit
//    — wraps our onSubmit function
//    — when the form submits, handleSubmit first runs Zod validation
//    — onSubmit (our function) only runs if validation PASSES
//    — if validation fails, onSubmit never runs at all — the errors
//      object gets filled instead and nothing is sent anywhere
//
// formState: { errors, isSubmitting }
//    — errors        → an object holding any validation error messages,
//                       one per field, e.g. errors.email.message
//    — isSubmitting  → true while onSubmit is currently running (waiting
//                       for registerNewUser to finish), false otherwise
//                       we use this to disable the button and show
//                       "Creating account..." while it's true

// ─── ONSUBMIT FUNCTION ───────────────────────────────────────────────────────
// const onSubmit = async (data: RegisterFormValues) => {...}
//    — this function ONLY runs after Zod has already confirmed the data
//      is valid (handled by handleSubmit above)
//    — data contains exactly what the user typed: { name, email, password,
//      confirmPassword } — fully typed and already validated
//    — async because we need to wait for the server to respond before
//      moving forward

// setServerError(null)
//    — clears out any old error message from a PREVIOUS failed attempt
//    — without this, if someone fixes their mistake and submits again,
//      an old error message could still be lingering on screen

// const result = await registerNewUser({...})
//    — calls our Server Action (the function that actually talks to
//      the database via Prisma)
//    — await pauses this function here until registerNewUser finishes
//      and sends back a response
//    — we only pass name, email, password — NOT confirmPassword, because
//      confirmPassword was only needed for the frontend check that the
//      two passwords match — the database doesn't need to store it

// if (!result.success) { setServerError(...); return; }
//    — registerNewUser returns an object shaped like { success: true }
//      or { success: false, error: "some message" }
//    — !result.success means "if it did NOT succeed"
//    — result.error ?? "Something went wrong"
//         → the ?? is the nullish coalescing operator
//         → if result.error has a real message, show that message
//         → if result.error is missing (undefined), fall back to the
//           generic text "Something went wrong" instead
//    — return immediately stops the function here — we do NOT want to
//      redirect the user to /login if registration actually failed

// router.push("/login")
//    — only reached if registration succeeded
//    — sends the user to the login page so they can now sign in with
//      the account they just created
