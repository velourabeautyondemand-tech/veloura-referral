'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'success' | 'error';

export default function AcceptTeamInvitePage() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Read the token directly from the browser URL rather than
    // next/navigation's useSearchParams, so this page never depends on a
    // Suspense boundary at build time - it's a one-shot client effect.
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      setStatus('error');
      setMessage('This invitation link is missing its token. Please use the link from your invitation email.');
      return;
    }

    fetch('/api/team-invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus('success');
          setEmail(data.email || '');
        } else {
          setStatus('error');
          setMessage(data.error || 'Unable to accept this invitation.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Target className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VÉLOURA Beauty on Demand</h1>
          <p className="text-sm text-muted-foreground">Team invitation</p>
        </div>

        <Card className="border-0 shadow-xl shadow-black/5">
          {status === 'loading' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
                <CardTitle className="text-xl">Confirming your invitation…</CardTitle>
                <CardDescription>This will only take a moment.</CardDescription>
              </CardHeader>
            </>
          )}

          {status === 'success' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Invitation accepted</CardTitle>
                <CardDescription>
                  You now have access to the VÉLOURA admin dashboard{email ? ` as ${email}` : ''}. Sign in with a one-time code sent to your email - no password needed.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full" size="lg">
                  <Link href={email ? `/login?email=${encodeURIComponent(email)}` : '/login'}>
                    Continue to sign in
                  </Link>
                </Button>
              </CardFooter>
            </>
          )}

          {status === 'error' && (
            <>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-xl">Invitation not accepted</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link href="/login">Go to sign in</Link>
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
