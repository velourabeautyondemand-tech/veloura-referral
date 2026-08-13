'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  Instagram,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialForm = { referrerEmail: '', technicianName: '', technicianEmail: '', technicianPhone: '' };

const referralSteps = [
  {
    title: 'Send the referral',
    description: 'Share your email and the beauty technician’s contact information.',
    icon: ClipboardCheck,
  },
  {
    title: 'VÉLOURA reviews',
    description: 'Our admin team reviews the technician and decides whether to approve them.',
    icon: BadgeCheck,
  },
  {
    title: 'Earn the $10 reward',
    description: 'The reward is earned only after approval and all required onboarding are complete.',
    icon: Gift,
  },
];

export default function ReferATechnicianPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/website-referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit the referral.');
      setSubmitted(true);
      setForm(initialForm);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit the referral.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7f8] px-4 py-10 text-[#4b1830] sm:px-6 sm:py-14">
      <div aria-hidden="true" className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#ffd6df]/70 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-[#f7b3c4]/50 blur-3xl" />
      <div aria-hidden="true" className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ffe5d7]/70 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mx-auto mb-5 h-24 w-24 overflow-hidden rounded-[28%] border-4 border-white shadow-[0_18px_45px_rgba(142,38,79,0.2)] sm:h-28 sm:w-28">
            <Image
              src="/veloura-brand-icon.webp"
              alt="VÉLOURA Beauty on Demand"
              width={384}
              height={384}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8a5b7] bg-white/85 px-4 py-2 text-sm font-semibold text-[#8d234d] shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Technician referral program
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#5c1734] sm:text-5xl">
            Know an exceptional beauty technician?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#744357] sm:text-lg">
            Refer them to VÉLOURA Beauty on Demand. You earn <strong className="text-[#a92f59]">$10</strong> only
            after they are approved and complete all required onboarding.
          </p>
          <p className="mt-2 text-sm font-medium text-[#8a6070]">
            Submitting a referral alone does not earn a reward.
          </p>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Card className="overflow-hidden border-[#f0c5d0] bg-white/95 shadow-[0_24px_70px_rgba(111,31,62,0.12)] backdrop-blur">
            <div className="h-2 bg-gradient-to-r from-[#f47a6a] via-[#d94f75] to-[#b62382]" />
            <CardHeader className="space-y-2 px-6 pb-5 pt-7 sm:px-8">
              <CardTitle className="text-2xl text-[#5c1734]">Submit a technician referral</CardTitle>
              <CardDescription className="text-[#805568]">
                Enter your email and the technician’s contact information. No account is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 sm:px-8">
              {submitted ? (
                <div className="space-y-5 rounded-2xl bg-[#fff3f6] px-5 py-10 text-center" role="status">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#dff6e7]">
                    <CheckCircle2 className="h-9 w-9 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#5c1734]">Referral received</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#744357]">
                      VÉLOURA Beauty on Demand will review the technician and track their onboarding. The reward
                      remains pending until both requirements are complete.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-[#d98aa1] text-[#8d234d] hover:bg-[#ffe7ed]"
                    onClick={() => setSubmitted(false)}
                  >
                    Refer another technician
                  </Button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={submit}>
                  <div className="space-y-2">
                    <Label htmlFor="referrerEmail" className="text-[#5c1734]">Your email</Label>
                    <Input
                      id="referrerEmail"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.referrerEmail}
                      onChange={(e) => setForm({ ...form, referrerEmail: e.target.value })}
                      className="h-12 border-[#e9c4ce] bg-white focus-visible:ring-[#d94f75]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="technicianName" className="text-[#5c1734]">Technician name</Label>
                    <Input
                      id="technicianName"
                      required
                      autoComplete="name"
                      value={form.technicianName}
                      onChange={(e) => setForm({ ...form, technicianName: e.target.value })}
                      className="h-12 border-[#e9c4ce] bg-white focus-visible:ring-[#d94f75]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="technicianEmail" className="text-[#5c1734]">Technician email</Label>
                    <Input
                      id="technicianEmail"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.technicianEmail}
                      onChange={(e) => setForm({ ...form, technicianEmail: e.target.value })}
                      className="h-12 border-[#e9c4ce] bg-white focus-visible:ring-[#d94f75]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="technicianPhone" className="text-[#5c1734]">Technician phone</Label>
                    <Input
                      id="technicianPhone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={form.technicianPhone}
                      onChange={(e) => setForm({ ...form, technicianPhone: e.target.value })}
                      className="h-12 border-[#e9c4ce] bg-white focus-visible:ring-[#d94f75]"
                    />
                  </div>
                  {error && (
                    <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>
                  )}
                  <Button
                    className="h-12 w-full bg-[#b8325a] text-base font-semibold text-white shadow-lg shadow-[#b8325a]/20 hover:bg-[#982448]"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Submit referral'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-7">
            <Card className="border-[#f0c5d0] bg-white/90 shadow-[0_18px_55px_rgba(111,31,62,0.09)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl text-[#5c1734]">How it works</CardTitle>
                <CardDescription className="text-[#805568]">Three clear steps from referral to reward.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {referralSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffe3ea] text-[#a92f59]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#5c1734]">{index + 1}. {step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#805568]">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-[#f1c2cf] bg-gradient-to-br from-white to-[#fff0f4] shadow-[0_18px_55px_rgba(111,31,62,0.09)]">
              <CardHeader className="pb-4">
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f47a46] via-[#d94f75] to-[#b62382] text-white">
                  <Instagram className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl text-[#5c1734]">Meet our beauty community</CardTitle>
                <CardDescription className="text-[#805568]">
                  Follow @veloura_beauty_x on Instagram for VÉLOURA Beauty on Demand updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="mx-auto hidden max-w-[230px] overflow-hidden rounded-3xl border border-[#f1d4dc] bg-white p-2 shadow-sm sm:block">
                  <Image
                    src="/veloura-instagram-qr.webp"
                    alt="Instagram QR code for @veloura_beauty_x"
                    width={480}
                    height={552}
                    className="h-auto w-full"
                  />
                </div>
                <a
                  href="https://www.instagram.com/veloura_beauty_x/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d98aa1] bg-white px-4 text-sm font-semibold text-[#8d234d] transition-colors hover:bg-[#ffe7ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d94f75] focus-visible:ring-offset-2"
                >
                  <Instagram className="h-4 w-4" />
                  Visit our Instagram
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>

        <footer className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-[#8a6070]">
          Rewards begin as pending. A $10 reward becomes earned only after the referred technician is approved
          and completes all required onboarding, and can later be marked paid by an administrator.
        </footer>
      </div>
    </main>
  );
}
