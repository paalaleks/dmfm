import React from 'react';

export default async function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex flex-col h-full'>
      <div className='absolute top-0 left-0 w-full h-full z-0 bg-linear-[170deg,_var(--teal-dark)_25%,_oklch(from_var(--seafoam-green)_l_c_h_/_0.4)_50%,_transparent_70%,_transparent_100%]' />
      {children}
    </div>
  );
}
