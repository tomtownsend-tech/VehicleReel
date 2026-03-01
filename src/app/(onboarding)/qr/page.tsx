import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function QRLandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    // Existing owner - route to their dashboard
    if (session.user.role === 'OWNER') {
      redirect('/owner/vehicles');
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

  // New user - route to register (no role pre-selected so they create their profile first)
  redirect('/register');
}
