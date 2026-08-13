'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialForm = { referrerEmail: '', technicianName: '', technicianEmail: '', technicianPhone: '' };

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
    <main className="min-h-screen bg-stone-50 px-4 py-12 text-stone-950">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm text-white">
            <Sparkles className="h-4 w-4" /> VÉLOURA Beauty on Demand technician referrals
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Know an exceptional beauty technician?</h1>
          <p className="mt-3 text-stone-600">Refer them to VÉLOURA Beauty on Demand. You earn $10 after they are approved and finish all required onboarding.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit a referral</CardTitle>
            <CardDescription>Submitting a referral does not immediately earn a reward.</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4 py-8 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-semibold">Referral received</h2>
                  <p className="mt-2 text-sm text-stone-600">VÉLOURA Beauty on Demand will review the technician and track their onboarding.</p>
                </div>
                <Button variant="outline" onClick={() => setSubmitted(false)}>Refer another technician</Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="referrerEmail">Your email</Label>
                  <Input id="referrerEmail" type="email" required autoComplete="email" value={form.referrerEmail} onChange={(e) => setForm({ ...form, referrerEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicianName">Technician name</Label>
                  <Input id="technicianName" required autoComplete="name" value={form.technicianName} onChange={(e) => setForm({ ...form, technicianName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicianEmail">Technician email</Label>
                  <Input id="technicianEmail" type="email" required autoComplete="email" value={form.technicianEmail} onChange={(e) => setForm({ ...form, technicianEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicianPhone">Technician phone</Label>
                  <Input id="technicianPhone" type="tel" required autoComplete="tel" value={form.technicianPhone} onChange={(e) => setForm({ ...form, technicianPhone: e.target.value })} />
                </div>
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit referral'}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
