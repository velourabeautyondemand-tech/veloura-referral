import { Apple, Play } from 'lucide-react';

export const APP_STORE_URL = 'https://apps.apple.com/us/app/veloura-beauty-on-demand/id6757140381';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.veloura.app';

// Text below is VÉLOURA's official onboarding copy - keep it word for word.
type Block =
  | { type: 'p'; text: string; strong?: boolean }
  | { type: 'list'; items: string[] };

const steps: { title: string; blocks: Block[] }[] = [
  {
    title: 'Step 1 — Download the VÉLOURA App & Register',
    blocks: [
      { type: 'p', text: 'Download the VÉLOURA Beauty On Demand app.' },
      { type: 'p', text: 'Create your account and make sure you select:' },
      { type: 'p', text: '“Login As Technician”', strong: true },
      { type: 'p', text: 'This will take you through the professional registration and onboarding process.' },
    ],
  },
  {
    title: 'Step 2 — Complete Your Professional Profile',
    blocks: [
      { type: 'p', text: 'Please complete all required information, including:' },
      {
        type: 'list',
        items: [
          'Full street address/service location',
          'Services you offer',
          'Your pricing',
          'Portfolio/work photos',
          'Professional license information, when required',
          'Your availability',
        ],
      },
      { type: 'p', text: 'Your profile must be complete before it can be fully reviewed and activated.' },
    ],
  },
  {
    title: 'Step 3 — Enter Your License Information',
    blocks: [
      { type: 'p', text: 'If your profession requires a state or professional license, enter your actual valid license number.' },
      { type: 'p', text: 'For services that do not require a professional license, use the following:' },
      { type: 'list', items: ['Makeup Artist: MAU2026', 'Photographer: PHOTO2026', 'Other non-licensed services: others2026'] },
      {
        type: 'p',
        text: 'Important: VÉLOURA verifies the services offered by professionals. If any service you select legally requires a professional license or additional credentials, your profile may be locked or prevented from becoming active until the required documentation is provided and your account is fully compliant.',
      },
    ],
  },
  {
    title: 'Step 4 — Pay the $29.99 Onboarding Fee',
    blocks: [
      { type: 'p', text: 'Complete the one-time $29.99 onboarding fee.' },
      {
        type: 'p',
        text: 'This is not intended as a profit center. It helps cover the onboarding and background-screening process and helps ensure commitment from both VÉLOURA and the professionals joining the platform.',
      },
      { type: 'p', text: 'The best part: your $29.99 onboarding fee is 100% refunded after your first completed booking through VÉLOURA.', strong: true },
      {
        type: 'p',
        text: "We're doing this to help maintain a committed, high-quality professional community, and we're glad to have you be part of it.",
      },
    ],
  },
  {
    title: 'Step 5 — Complete Your Checkr Background Check',
    blocks: [
      { type: 'p', text: 'After completing the required onboarding steps, follow the instructions from Checkr to complete your background screening.' },
      { type: 'p', text: 'Please check your email, including your spam/junk folder, for messages from Checkr.' },
      {
        type: 'p',
        text: 'Important: If you are aware of information that may prevent you from successfully completing the required background screening, please consider this before submitting payment. Once background-screening costs have been incurred, the onboarding fee may not be refundable if you discontinue onboarding before completing your first booking.',
      },
    ],
  },
  {
    title: 'Step 6 — VÉLOURA Reviews Your Account',
    blocks: [
      { type: 'p', text: 'Our team will review your:' },
      {
        type: 'list',
        items: [
          'Profile information',
          'Services',
          'Professional license/credentials, when required',
          'Portfolio',
          'Background-screening status',
          'Other required onboarding information',
        ],
      },
      { type: 'p', text: 'If something is missing or needs to be corrected, your profile may remain pending until the requirements are completed.' },
    ],
  },
  {
    title: 'Step 7 — Your Account Becomes Active',
    blocks: [
      {
        type: 'p',
        text: 'Once your onboarding requirements have been completed and your account is approved, your professional profile can become active and appear in customer searches.',
      },
      {
        type: 'p',
        text: 'Approval does not guarantee bookings. Customer requests depend on location, service type, availability, pricing, and customer demand.',
      },
    ],
  },
  {
    title: 'Step 8 — Keep Your Profile Visible',
    blocks: [
      { type: 'p', text: 'Getting approved is only the beginning.' },
      { type: 'p', text: 'To help customers find you, make sure you:' },
      {
        type: 'list',
        items: [
          'Keep your full service address current',
          'Update your availability at least every two weeks',
          'Keep your services and pricing current',
          'Maintain an updated portfolio',
          'Turn on app notifications',
        ],
      },
      { type: 'p', text: "Even if you don't receive a booking immediately, stay active and visible on the platform." },
      {
        type: 'p',
        text: "A customer may not need your service today, but they may search for you tomorrow, next week, while traveling, or for an upcoming special event. If your availability isn't current and your profile isn't visible, they may not be able to find you.",
      },
      { type: 'p', text: 'Stay visible. Stay available. Your next client could be searching for you.', strong: true },
    ],
  },
  {
    title: 'Step 9 — Receive Bookings Through VÉLOURA',
    blocks: [
      { type: 'p', text: 'Customers search VÉLOURA for professionals based on their desired service, location, and availability.' },
      { type: 'p', text: 'When a customer selects your services, the booking and payment are handled through the VÉLOURA platform.' },
      { type: 'p', text: 'Professionals receive 80% of the service booking amount.', strong: true },
      { type: 'p', text: 'There are no monthly membership fees, and you control your services, pricing, and availability.' },
    ],
  },
];

// Shown after a referral/application is submitted: guides the technician
// to download the app and finish their professional profile.
export function JoinVelouraSteps({ forApplicant }: { forApplicant: boolean }) {
  return (
    <div className="space-y-5 text-left">
      <div className="text-center">
        {!forApplicant && (
          <p className="mb-2 text-sm font-semibold text-[#a92f59]">Please share these steps with the technician.</p>
        )}
        <h3 className="text-xl font-semibold text-[#5c1734]">How to Join VÉLOURA as a Beauty &amp; Lifestyle Professional</h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#805568]">
          Welcome to VÉLOURA Beauty On Demand! Follow the steps below to complete your professional profile and become
          active on the platform.
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
        {steps.map((step) => (
          <li key={step.title} className="rounded-2xl bg-white/80 p-4">
            <p className="font-semibold text-[#5c1734]">{step.title}</p>
            <div className="mt-2 space-y-2 text-sm leading-6 text-[#744357]">
              {step.blocks.map((block, i) =>
                block.type === 'list' ? (
                  <ul key={i} className="list-disc space-y-0.5 pl-5">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className={block.strong ? 'font-semibold text-[#5c1734]' : undefined}>
                    {block.text}
                  </p>
                )
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="text-center text-sm font-semibold text-[#5c1734]">
        Welcome to VÉLOURA Beauty On Demand — we&apos;re excited to have you grow with us.
      </p>
    </div>
  );
}
