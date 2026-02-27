import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function QRLandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    // Existing user - route to add vehicle
    redirect('/owner/vehicles/new');
  }

  // New user - route to register as owner
  redirect('/register?role=OWNER');
}
