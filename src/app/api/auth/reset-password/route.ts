import { NextRequest, NextResponse } from 'next/server';

import { extractBackendErrorMessage } from '@/utils/error';
import { API_BASE_URL } from '@/utils/auth-constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, new_password, confirm_password } = body;

    if (!token || !new_password || !confirm_password) {
      return NextResponse.json(
        { success: false, message: 'Token and new password are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, new_password, confirm_password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = extractBackendErrorMessage(payload, 'Failed to reset password');
      return NextResponse.json({ success: false, message }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password request failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
