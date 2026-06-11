import { NextRequest, NextResponse } from 'next/server';

import { extractBackendErrorMessage } from '@/utils/error';
import { API_BASE_URL } from '@/utils/auth-constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, app: 'admin' }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = extractBackendErrorMessage(payload, 'Failed to send reset email');
      return NextResponse.json({ success: false, message }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message:
        payload?.message ||
        'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password request failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send reset email' },
      { status: 500 }
    );
  }
}
