import { Outlet } from 'react-router';

import backgroundPattern from '@documenso/assets/images/background-pattern.png';

import { BrandingLogo } from '~/components/general/branding-logo';

export default function Layout() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 md:p-12 lg:p-24">
      <div>
        <div className="absolute -inset-[min(600px,max(400px,60vw))] -z-[1] flex items-center justify-center opacity-70">
          <img
            src={backgroundPattern}
            alt="background pattern"
            className="dark:brightness-95 dark:contrast-[70%] dark:invert dark:sepia"
            style={{
              mask: 'radial-gradient(rgba(255, 255, 255, 1) 0%, transparent 80%)',
              WebkitMask: 'radial-gradient(rgba(255, 255, 255, 1) 0%, transparent 80%)',
            }}
          />
        </div>

        {/* MODIFIED for BizRethink overlay 026: render Pacta brand lockup
            above the unauthenticated card so signin / signup / verify-email
            pages carry platform branding. Upstream renders these screens
            with no logo. Wordmark large + tagline beneath for presence. */}
        <div className="relative mb-12 flex flex-col items-center gap-y-3">
          <BrandingLogo className="h-14 w-auto text-foreground" />
          <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
            Agreements that hold
          </p>
        </div>

        <div className="relative w-full">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
