'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Referral = {
  id: string;
  referrerEmail: string;
  technicianName: string;
  technicianEmail: string;
  technicianPhone: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  onboardingCompletedAt: string | null;
  rewardStatus: 'PENDING' | 'EARNED' | 'PAID';
  rewardAmountCents: number;
  createdAt: string;
};

type Action = 'approve' | 'reject' | 'complete_onboarding' | 'mark_paid';

export default function TechnicianReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/website-referrals');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load referrals.');
    setReferrals(data.referrals);
  }, []);

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, [load]);

  async function act(id: string, action: Action) {
    setWorkingId(id);
    setError('');
    try {
      const response = await fetch(`/api/admin/website-referrals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update referral.');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update referral.');
    } finally {
      setWorkingId('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Technician referrals</h1>
        <p className="text-muted-foreground">Website referrals only. Rewards earn after approval and completed onboarding.</p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
      <Card>
        <CardHeader><CardTitle>Referral review</CardTitle><CardDescription>$10 rewards are tracked separately from bookings and affiliate commissions.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Technician</TableHead><TableHead>Referrer</TableHead><TableHead>Review</TableHead><TableHead>Onboarding</TableHead><TableHead>Reward</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell><p className="font-medium">{referral.technicianName}</p><p className="text-xs text-muted-foreground">{referral.technicianEmail} · {referral.technicianPhone}</p></TableCell>
                    <TableCell>{referral.referrerEmail}</TableCell>
                    <TableCell><Badge variant={referral.status === 'REJECTED' ? 'destructive' : referral.status === 'APPROVED' ? 'default' : 'secondary'}>{referral.status}</Badge></TableCell>
                    <TableCell>{referral.onboardingCompletedAt ? 'Complete' : 'Pending'}</TableCell>
                    <TableCell><Badge variant={referral.rewardStatus === 'PAID' ? 'default' : 'outline'}>{referral.rewardStatus} · ${(referral.rewardAmountCents / 100).toFixed(2)}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      {referral.status === 'PENDING' && <><Button size="sm" disabled={workingId === referral.id} onClick={() => act(referral.id, 'approve')}>Approve</Button><Button size="sm" variant="destructive" disabled={workingId === referral.id} onClick={() => act(referral.id, 'reject')}>Reject</Button></>}
                      {!referral.onboardingCompletedAt && referral.status !== 'REJECTED' && <Button size="sm" variant="outline" disabled={workingId === referral.id} onClick={() => act(referral.id, 'complete_onboarding')}>Onboarding complete</Button>}
                      {referral.rewardStatus === 'EARNED' && <Button size="sm" disabled={workingId === referral.id} onClick={() => act(referral.id, 'mark_paid')}>Mark paid</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {!referrals.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No website technician referrals yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
