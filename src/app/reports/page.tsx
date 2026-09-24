import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.role === 'DEVELOPER') {
    redirect('/developer/dashboard');
  } else {
    redirect('/school/attendance');
  }
}
