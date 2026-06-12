import { NextRequest, NextResponse } from 'next/server';

import { extractBackendErrorMessage } from '@/utils/error';
import { API_BASE_URL } from '@/utils/auth-constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mfaToken = body?.mfa_token;

    if (!mfaToken) {
      return NextResponse.json(
        { success: false, message: 'MFA token is required' },
        { status: 400 }
      );
    }

    const enrollResponse = await fetch(`${API_BASE_URL}/api/auth/login/mfa/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken }),
    });

    const payload = await enrollResponse.json();

    if (!enrollResponse.ok) {
      const message = extractBackendErrorMessage(payload, 'Could not start MFA setup');
      return NextResponse.json(
        {
          success: false,
          message,
          error: payload?.error ?? null,
        },
        { status: enrollResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'Scan the QR code with your authenticator app',
      data: payload?.data ?? null,
    });
  } catch (error) {
    console.error('Admin MFA enrollment failed:', error);
    return NextResponse.json(
      { success: false, message: 'Could not start MFA setup' },
      { status: 500 }
    );
  }
}
