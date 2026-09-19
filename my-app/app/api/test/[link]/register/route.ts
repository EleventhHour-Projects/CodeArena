import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import TestCandidateAttempt from '@/lib/models/TestCandidateAttempt';

// POST /api/test/[link]/register — register candidate for test
export async function POST(request: Request, { params }: { params: Promise<{ link: string }> }) {
  try {
    const { link } = await params;
    await dbConnect();

    const test = await TestAssessment.findOne({ testLink: link, status: 'active' });
    if (!test) {
      return NextResponse.json({ error: 'Test not found or no longer active' }, { status: 404 });
    }

    const now = new Date();
    if (test.validFrom && now < test.validFrom) {
      return NextResponse.json({ error: 'Test has not started yet' }, { status: 403 });
    }
    if (test.validUntil && now > test.validUntil) {
      return NextResponse.json({ error: 'Test link has expired' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, rollNumber, phone } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check for existing attempt
    const existingAttempt = await TestCandidateAttempt.findOne({
      testId: test._id,
      'candidate.email': email.toLowerCase(),
    });

    if (existingAttempt) {
      if (existingAttempt.status === 'submitted' || existingAttempt.status === 'terminated') {
        return NextResponse.json({ error: 'You have already completed this test' }, { status: 409 });
      }
      // Resume existing attempt
      return NextResponse.json({
        attemptId: existingAttempt._id.toString(),
        status: existingAttempt.status,
        message: 'Resuming existing attempt',
      });
    }

    const attempt = await TestCandidateAttempt.create({
      testId: test._id,
      companyId: test.companyId,
      candidate: { name, email: email.toLowerCase(), rollNumber, phone },
      maxScore: test.questions.reduce((sum, q) => sum + q.points, 0),
      status: 'registered',
    });

    return NextResponse.json({ attemptId: attempt._id.toString(), status: 'registered' }, { status: 201 });
  } catch (error: any) {
    console.error('Register candidate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
