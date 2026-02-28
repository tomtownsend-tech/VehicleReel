import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function QRLandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    // Existing owner - route to add vehicle
    if (session.user.role === 'OWNER') {
      redirect('/owner/vehicles/new');
    }
    // Production users go to their dashboard
    if (session.user.role === 'PRODUCTION') {
      redirect('/production/search');
    }
    // Admins go to admin dashboard
    if (session.user.role === 'ADMIN') {
      redirect('/admin/analytics');
    }
  }

  // New user - route to register as owner
  redirect('/register?role=OWNER');
}
