import { auth } from "@/auth";
import NotFoundContent from "@/components/content/errors/notFoundContent";

export default async function NotFound() {
  const session = await auth();
  return <NotFoundContent isSignedIn={Boolean(session?.user)} />;
}
