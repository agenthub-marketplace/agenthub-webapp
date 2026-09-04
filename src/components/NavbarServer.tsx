import { getCurrentProfile } from "@/lib/auth/session";
import Navbar from "@/components/Navbar";

export default async function NavbarServer() {
  const profile = await getCurrentProfile();

  return <Navbar profile={profile} />;
}
