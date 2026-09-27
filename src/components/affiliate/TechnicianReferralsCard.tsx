'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Copy, Sparkles, Landmark } from 'lucide-react';

type StripeStatus = {
  configured: boolean;
  connected: boolean;
  payoutsEnabled: boolean;
};

type TechnicianReferral = {
  id: string;
  technicianName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  onboardingCompletedAt: string | null;
  rewardStatus: 'PENDING' | 'EARNED' | 'PAID';
  rewardAmountCents: number;
  createdAt: string;
};

type Totals = {
  submitted: number;
  approved: number;
  pendingCents: number;
  earnedCents: number;
  paidCents: number;
};

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function reviewBadge(status: TechnicianReferral['status']) {
  if (status === 'APPROVED') return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive">Not approved</Badge>;
  return <Badge variant="secondary">In review</Badge>;
}

function rewardLabel(r: TechnicianReferral) {
  if (r.status === 'REJECTED') return <span className="text-muted-foreground">—</span>;
  if (r.rewardStatus === 'PAID') return <span className="font-semibold text-emerald-700">Paid · {usd(r.rewardAmountCents)}</span>;
  if (r.rewardStatus === 'EARNED') return <span className="font-semibold text-emerald-700">Earned · {usd(r.rewardAmountCents)}</span>;
  return <span className="text-amber-700">Pending · {usd(r.rewardAmountCents)}</span>;
}

export function TechnicianReferralsCard() {
  const [referrals, setReferrals] = useState<TechnicianReferral[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState<StripeStatus | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeError, setStripeError] = useState('');

  useEffect(() => {
    fetch('/api/affiliate/technician-referrals')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.success) return;
        setReferrals(data.referrals || []);
        setTotals(data.totals || null);
        if (data.referralCode) {
          setLink(`${window.location.origin}/refer-a-technician?ref=${encodeURIComponent(data.referralCode)}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/affiliate/stripe')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStripe(data); })
      .catch(() => {});
  }, []);

  const openStripe = async (action: 'onboard' | 'dashboard') => {
    setStripeBusy(true);
    setStripeError('');
    try {
      const res = await fetch('/api/affiliate/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Unable to open Stripe.');
      window.location.href = data.url;
    } catch (e) {
      setStripeError(e instanceof Error ? e.message : 'Unable to open Stripe.');
      setStripeBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      // Clipboard can be blocked; the link is still visible to copy by hand.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Technician referrals — $10 each
        </CardTitle>
        <CardDescription>
          Share your link. Anyone who applies through it is credited to you automatically. You earn $10 for each
          technician VÉLOURA approves, paid out weekly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Your application link</p>
          <div className="flex gap-2">
            <Input readOnly value={loading ? 'Loading…' : link} className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={copy} disabled={!link} aria-label="Copy link">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {stripe?.configured && (
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {stripe.payoutsEnabled
                    ? 'Stripe connected: you’re set up for Friday payouts'
                    : stripe.connected
                      ? 'Finish your Stripe setup to get paid'
                      : 'Connect Stripe to get paid'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Earned rewards are sent to your bank through Stripe every Friday.
                </p>
                {stripeError && <p className="mt-1 text-xs text-destructive">{stripeError}</p>}
              </div>
            </div>
            <Button
              variant={stripe.payoutsEnabled ? 'outline' : 'default'}
              disabled={stripeBusy}
              onClick={() => openStripe(stripe.payoutsEnabled ? 'dashboard' : 'onboard')}
            >
              {stripeBusy ? 'Opening Stripe…' : stripe.payoutsEnabled ? 'View Stripe account' : stripe.connected ? 'Finish setup' : 'Connect Stripe'}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Applications', value: String(totals?.submitted ?? 0) },
            { label: 'Approved', value: String(totals?.approved ?? 0) },
            { label: 'Earned, not yet paid', value: usd(totals?.earnedCents ?? 0) },
            { label: 'Paid to you', value: usd(totals?.paidCents ?? 0) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border p-3">
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {referrals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {loading ? 'Loading…' : 'No applications yet. Share your link to get started.'}
          </p>
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="text-right">Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.technicianName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell>{reviewBadge(r.status)}</TableCell>
                    <TableCell className="text-right text-sm">{rewardLabel(r)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
