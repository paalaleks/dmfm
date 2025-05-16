import { LoginForm } from '@/components/login-form'
import { LogoutButton } from '@/components/nav/logout-button';

export default function Page() {
  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 z-10 relative'>
      <div className='absolute top-0 left-0 w-full h-full z-0 bg-linear-[170deg,_var(--teal-dark)_25%,_oklch(from_var(--seafoam-green)_l_c_h_/_0.4)_50%,_transparent_70%,_transparent_100%]' />

      <div className='w-full max-w-sm z-10'>
        <LoginForm />
        <LogoutButton />
      </div>
    </div>
  );
}
