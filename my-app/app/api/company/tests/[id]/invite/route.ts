import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import Company from '@/lib/models/Company';
import { sendAssessmentInviteEmail } from '@/lib/email';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-admin-key-code-arena'
);

async function authenticateCompany() {
  const cookieStore = await cookies();
  const token = cookieStore.get('company_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'company' || !payload.id) return null;
    return { id: payload.id as string };
  } catch {
    return null;
  }
}

// GET: Fetch invited candidates list
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCompany();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const test = await TestAssessment.findOne({ _id: id, companyId: auth.id }).lean();
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    return NextResponse.json({
      invitedCandidates: (test as any).invitedCandidates || [],
      testLink: test.testLink,
    });
  } catch (error: any) {
    console.error('GET invited candidates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Add candidates, delete, or trigger Resend email sending
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCompany();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    await dbConnect();

    const test = await TestAssessment.findOne({ _id: id, companyId: auth.id });
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    const company = await Company.findById(auth.id).select('name logo email website').lean();

    if (!Array.isArray(test.invitedCandidates)) {
      test.invitedCandidates = [];
    }

    if (action === 'add' || action === 'import') {
      const { candidates } = body; // Array of { email: string, name?: string }
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return NextResponse.json({ error: 'No candidate data provided' }, { status: 400 });
      }

      let addedCount = 0;
      for (const item of candidates) {
        const email = item.email?.trim().toLowerCase();
        if (!email || !email.includes('@')) continue;

        const existing = test.invitedCandidates.find((c) => c.email.toLowerCase() === email);
        if (existing) {
          if (item.name && item.name.trim()) {
            existing.name = item.name.trim();
          }
        } else {
          test.invitedCandidates.push({
            email,
            name: item.name?.trim() || '',
            token: uuidv4().replace(/-/g, '').slice(0, 16),
            inviteSent: false,
            status: 'pending',
          });
          addedCount++;
        }
      }

      await test.save();
      return NextResponse.json({
        success: true,
        message: `Processed candidates (${addedCount} new added)`,
        invitedCandidates: test.invitedCandidates,
      });
    }

    if (action === 'delete') {
      const { token, email } = body;
      test.invitedCandidates = test.invitedCandidates.filter(
        (c) => c.token !== token && c.email.toLowerCase() !== (email || '').toLowerCase()
      );
      await test.save();
      return NextResponse.json({
        success: true,
        message: 'Candidate removed',
        invitedCandidates: test.invitedCandidates,
      });
    }

    if (action === 'send_email') {
      const { tokens, sendAll } = body;
      const candidatesToSend = test.invitedCandidates.filter((c) => {
        if (sendAll) return true;
        return Array.isArray(tokens) && tokens.includes(c.token);
      });

      if (candidatesToSend.length === 0) {
        return NextResponse.json({ error: 'No candidates selected for email' }, { status: 400 });
      }

      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const baseUrl = `${protocol}://${host}`;

      let companyLogoUrl = '';
      if (company?.logo) {
        if (
          company.logo.startsWith('data:image/') ||
          company.logo.startsWith('http://') ||
          company.logo.startsWith('https://')
        ) {
          companyLogoUrl = company.logo;
        } else {
          companyLogoUrl = `${baseUrl}${company.logo.startsWith('/') ? '' : '/'}${company.logo}`;
        }
      }

      let sentCount = 0;
      const failures: string[] = [];

      for (const cand of candidatesToSend) {
        const candidateCustomLink = `${baseUrl}/test/${test.testLink}?token=${cand.token}`;

        const result = await sendAssessmentInviteEmail({
          to: cand.email,
          candidateName: cand.name,
          assessmentTitle: test.title,
          companyName: company?.name || 'Organization',
          companyLogo: companyLogoUrl || undefined,
          companyWebsite: company?.website || undefined,
          testUrl: candidateCustomLink,
          durationMinutes: test.durationMinutes,
          validFrom: test.validFrom,
          validUntil: test.validUntil,
        });

        if (result.success) {
          cand.inviteSent = true;
          cand.inviteSentAt = new Date();
          sentCount++;
        } else {
          failures.push(`${cand.email}: ${result.error || 'Failed to send'}`);
        }
      }

      await test.save();

      return NextResponse.json({
        success: true,
        sentCount,
        failedCount: failures.length,
        failures,
        invitedCandidates: test.invitedCandidates,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Candidate invite action error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
