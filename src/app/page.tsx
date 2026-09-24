import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'DEVELOPER') {
    redirect('/developer/dashboard');
  } else if (user.role === 'SCHOOL_ADMIN') {
    redirect('/school/dashboard');
  } else {
    redirect('/teacher/scan');
  }
}
