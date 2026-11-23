// The one wrapper every API route handler goes through (see docs/plan/04-api.md).
// It does the steps every handler needs, in order, so none can be forgotten:
// read the session → 401 if required and missing → validate params, query and body with Zod →
// call the handler → return its result as JSON → turn anything thrown into our error shape.
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { auth } from "@/auth";
import { errorResponse, readJson, unauthenticated } from "@/server/lib/errors";

export type SessionUser = Session["user"];

type Schemas = {
  /** Checks the JSON body. Without it, the body isn't read at all. */
  body?: z.ZodType;
  /** Checks the dynamic route segments, e.g. { projectId }. */
  params?: z.ZodType;
  /** Checks the query string, given as an object of strings. */
  query?: z.ZodType;
};

type RouteOptions<S extends Schemas, RequireAuth extends boolean> = S & {
  /**
   * true: answer 401 unless signed in. false: a public route; the session isn't read at all
   * (no database work, and the same timing for everyone), so `user` is null.
   * Every route says this explicitly in its first line.
   */
  auth: RequireAuth;
  /** Status for a successful answer. Default 200; creates use 201. */
  status?: number;
};

/** The schema's parsed value, or undefined when no schema was given. */
type Parsed<T> = T extends z.ZodType ? z.output<T> : undefined;

export type RouteContext<S extends Schemas, RequireAuth extends boolean> = {
  request: Request;
  user: RequireAuth extends true ? SessionUser : null;
  body: Parsed<S["body"]>;
  params: Parsed<S["params"]>;
  query: Parsed<S["query"]>;
};

/** What Next.js passes as a handler's second argument. In Next 15, params is a Promise. */
type SegmentData = { params: Promise<Record<string, string | string[] | undefined>> };

/**
 * Builds a route handler. Example:
 *   export const GET = route({ auth: true }, ({ user }) => getMe(user.id));
 * Return a plain value (sent as JSON) or a Response (sent as is).
 */
export function route<const S extends Schemas, const RequireAuth extends boolean>(
  options: RouteOptions<S, RequireAuth>,
  handler: (context: RouteContext<S, RequireAuth>) => unknown
) {
  // `segment` must be required: Next's build checks the handler's second argument is
  // assignable to { params: Promise<…> }, and an optional one (… | undefined) isn't.
  return async (request: Request, segment: SegmentData): Promise<Response> => {
    try {
      let user: SessionUser | null = null;
      if (options.auth) {
        // auth() also runs our jwt callback, which reloads the user and returns no session when
        // the password changed after this session signed in. So "no user" covers that case too.
        const session = await auth();
        user = session?.user?.id ? session.user : null;
        if (!user) throw unauthenticated();
      }

      const rawParams = await segment.params;
      const rawQuery = Object.fromEntries(new URL(request.url).searchParams);

      const context = {
        request,
        user,
        params: options.params ? options.params.parse(rawParams) : undefined,
        query: options.query ? options.query.parse(rawQuery) : undefined,
        body: options.body ? options.body.parse(await readJson(request)) : undefined,
      } as RouteContext<S, RequireAuth>;

      const result = await handler(context);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? null, { status: options.status ?? 200 });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
