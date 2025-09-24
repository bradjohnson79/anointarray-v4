'use client';

import { SignIn } from '@clerk/nextjs';
import EnergyRibbons from '@/components/energy-ribbons';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      <EnergyRibbons intensity="subtle" count={2} />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full mystical-card p-6 rounded-lg">
          <SignIn
            routing="hash"
            signUpUrl="/auth/signup"
            afterSignInUrl="/api/session/redirect"
            appearance={{
              elements: {
                card: 'bg-transparent border border-purple-500/30 shadow-none',
                headerSubtitle: 'text-gray-300',
                formButtonPrimary: 'bg-purple-600 hover:bg-purple-500',
              },
              variables: {
                colorBackground: 'transparent',
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
