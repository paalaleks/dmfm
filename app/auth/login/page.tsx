import { LoginForm } from '@/components/login-form'
import { LogoutButton } from '@/components/nav/logout-button';

export default function Page() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 z-10 relative'>
      <div className='w-full max-w-sm'>
        <LoginForm />
        <LogoutButton />
      </div>
    </div>
  );
}
