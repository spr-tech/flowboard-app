/**
 * The site's public address, for metadata: canonical links, social card URLs, robots.txt and the
 * sitemap. Never throws, so a build without APP_URL (CI, a local `next build`) still succeeds.
 *
 * Email links use appUrl() instead, which refuses to guess in production: a wrong address there
 * would send people somewhere else, while here it only makes a preview's social card point home.
 *
 * Order: APP_URL → the production domain on Vercel's production deployments → the branch URL on
 * previews → http://localhost:3000.
 */
export function siteUrl(): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && productionDomain) return `https://${productionDomain}`;

  const branchUrl = process.env.VERCEL_BRANCH_URL;
  if (branchUrl) return `https://${branchUrl}`;

  return "http://localhost:3000";
}
