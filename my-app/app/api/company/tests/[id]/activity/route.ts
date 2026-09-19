import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import TestCandidateAttempt from '@/lib/models/TestCandidateAttempt';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-admin-key-code-arena'
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('company_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let companyId: string;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role !== 'company') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      companyId = payload.companyId as string;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    // Verify test belongs to company
    const test = await TestAssessment.findOne({ _id: id, companyId }).lean();
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Fetch all attempts for this test
    const attempts = await TestCandidateAttempt.find({ testId: id })
      .sort({ createdAt: -1 })
      .lean();

    const maxScore = test.questions.reduce((sum, q) => sum + (q.points || 0), 0);

    const stats = {
      totalCandidates: attempts.length,
      inProgress: attempts.filter((a) => a.status === 'in_progress').length,
      submitted: attempts.filter((a) => a.status === 'submitted').length,
      terminated: attempts.filter((a) => a.status === 'terminated').length,
      averageScore:
        attempts.filter((a) => a.status === 'submitted').length > 0
          ? Math.round(
              attempts
                .filter((a) => a.status === 'submitted')
                .reduce((sum, a) => sum + (a.totalScore || 0), 0) /
                attempts.filter((a) => a.status === 'submitted').length
            )
          : 0,
      violationsCount: attempts.reduce((sum, a) => sum + (a.violations?.length || 0), 0),
    };

    return NextResponse.json({
      test: {
        id: test._id.toString(),
        title: test.title,
        status: test.status,
        maxScore,
        questionsCount: test.questions.length,
        durationMinutes: test.durationMinutes,
      },
      stats,
      attempts: attempts.map((a) => ({
        id: a._id.toString(),
        candidate: a.candidate,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        tabSwitchCount: a.tabSwitchCount || 0,
        violations: a.violations || [],
        answers: a.answers || [],
        totalScore: a.totalScore || 0,
        maxScore: a.maxScore || maxScore,
        feedback: a.feedback || null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('Test activity API error:', error);
    return NextResponse.json({ error: 'Failed to fetch test activity' }, { status: 500 });
  }
}
