import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import dbConnect from '@/lib/dbConnect';
import Admin from '@/lib/models/Admin';

// Allowed sender addresses and their restrictions
const ALLOWED_SENDERS: { email: string; restrictedTo?: string }[] = [
  { email: 'CodeArena Support <support@codearena.pro>' },
  { email: 'CodeArena <noreply@codearena.pro>' },
  { email: 'Manav Sharma <manav@codearena.pro>', restrictedTo: 'manav' },
  { email: 'Dhananjay Mishra <dhananjay@codearena.pro>', restrictedTo: 'dhananjay' },
];

export async function POST(request: Request) {
  try {
    const adminPayload = await requireAdmin();
    if (!adminPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, content, contentType, from } = body;

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'to, subject, and content are required' },
        { status: 400 }
      );
    }

    if (!from) {
      return NextResponse.json(
        { error: 'Sender address is required' },
        { status: 400 }
      );
    }

    // Validate sender is in our allowed list
    const senderConfig = ALLOWED_SENDERS.find((s) => s.email === from);
    if (!senderConfig) {
      return NextResponse.json(
        { error: 'Invalid sender address' },
        { status: 403 }
      );
    }

    // If sender is restricted to a specific admin, verify identity
    if (senderConfig.restrictedTo) {
      await dbConnect();
      const admin = await Admin.findById(String(adminPayload.id)).select('username');
      if (!admin || admin.username?.toLowerCase() !== senderConfig.restrictedTo) {
        return NextResponse.json(
          { error: `Only ${senderConfig.restrictedTo} can send from this address` },
          { status: 403 }
        );
      }
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    // Build the payload for Resend API
    const payload: Record<string, unknown> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    if (contentType === 'html') {
      payload.html = content;
    } else {
      payload.text = content;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[SEND-EMAIL] Resend error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send email via Resend' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: unknown) {
    console.error('[SEND-EMAIL] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
