// Safety lock for commands that wipe the database (db:seed, db:reset).
// They only run when ALLOW_DB_RESET=true is set (local .env only, never on Vercel),
// and they print the host they are about to wipe first.
//
// Used two ways:
// - as a script: `tsx prisma/db-guard.ts` (the first step of db:reset)
// - as an import: seed.ts calls assertDbResetAllowed() before deleting anything
import "dotenv/config";

function hostOf(url: string | undefined): string {
  if (!url) return "(DIRECT_URL is not set)";
  try {
    return new URL(url).host;
  } catch {
    return "(DIRECT_URL is not a valid URL)";
  }
}

export function assertDbResetAllowed(): void {
  const host = hostOf(process.env.DIRECT_URL);
  console.log(`\nDatabase to wipe: ${host}\n`);

  if (process.env.ALLOW_DB_RESET !== "true") {
    console.error(
      'Refusing to run: ALLOW_DB_RESET is not "true".\n' +
        "Set ALLOW_DB_RESET=true in your local .env only if this is a database you are happy to wipe."
    );
    process.exit(1);
  }
}

// Run directly: `tsx prisma/db-guard.ts`
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/db-guard.ts")) {
  assertDbResetAllowed();
}
