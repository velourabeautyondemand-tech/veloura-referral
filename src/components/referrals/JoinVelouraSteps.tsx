import type { ReactNode } from 'react';
import { Apple, Play } from 'lucide-react';

export const APP_STORE_URL = 'https://apps.apple.com/us/app/veloura-beauty-on-demand/id6757140381';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.veloura.app';

const steps: { title: string; body: ReactNode }[] = [
  {
    title: 'Download the VÉLOURA app & register',
    body: (
      <>
        Download VÉLOURA Beauty On Demand, create your account, and make sure you select{' '}
        <strong>“Login As Technician”</strong>. This takes you through professional registration and onboarding.
      </>
    ),
  },
  {
    title: 'Complete your professional profile',
    body: (
      <>
        Add your full street address/service location, the services you offer, your pricing, portfolio/work
        photos, professional license information (when required), and your availability. Your profile must be
        complete before it can be reviewed and activated.
      </>
    ),
  },
  {
    title: 'Enter your license information',
    body: (
      <>
        If your profession requires a state or professional license, enter your valid license number. For
        services that don’t require a license, use: <strong>Makeup Artist: MAU2026</strong> ·{' '}
        <strong>Photographer: PHOTO2026</strong> · <strong>Other non-licensed services: others2026</strong>.
        <span className="mt-1 block text-xs">
          VÉLOURA verifies every service. If a service you select legally requires a license or other credentials,
          your profile may stay locked until the required documentation is provided.
        </span>
      </>
    ),
  },
  {
    title: 'Pay the $29.99 onboarding fee',
    body: (
      <>
        A one-time fee that helps cover onboarding and background screening. It’s{' '}
        <strong>100% refunded after your first completed booking</strong> through VÉLOURA.
      </>
    ),
  },
  {
    title: 'Complete your Checkr background check',
    body: (
      <>
        Follow the instructions Checkr emails you (check your spam/junk folder too).
        <span className="mt-1 block text-xs">
          If you know of anything that may prevent you from passing the background screening, please consider this
          before paying. Once screening costs are incurred, the fee may not be refundable if you stop onboarding
          before your first booking.
        </span>
      </>
    ),
  },
  {
    title: 'VÉLOURA reviews your account',
    body: (
      <>
        Our team reviews your profile information, services, license/credentials and background check. Once
        everything is approved, your profile goes live and you can start accepting bookings.
      </>
    ),
  },
];

// Shown after a referral/application is submitted: guides the technician
// to download the app and finish their professional profile.
export function JoinVelouraSteps({ forApplicant }: { forApplicant: boolean }) {
  return (
    <div className="space-y-5 text-left">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-[#5c1734]">
          {forApplicant ? 'Next: finish your application in the VÉLOURA app' : 'Share these next steps with the technician'}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#805568]">
          {forApplicant
            ? 'Your profile is completed in the app. Download it now and follow the steps below.'
            : 'They complete their professional profile in the VÉLOURA app.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-5 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Apple className="h-5 w-5" />
          Download on the App Store
        </a>
        <a
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-5 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Play className="h-5 w-5" />
          Get it on Google Play
        </a>
      </div>

      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-2xl bg-white/80 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b8325a] text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-[#5c1734]">{step.title}</p>
              <div className="mt-1 text-sm leading-6 text-[#744357]">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
