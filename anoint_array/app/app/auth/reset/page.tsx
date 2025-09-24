import { redirect } from 'next/navigation';

export default function PasswordResetRedirect() {
  redirect('/auth/login');
}
