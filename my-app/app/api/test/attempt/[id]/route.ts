import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import TestCandidateAttempt from '@/lib/models/TestCandidateAttempt';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const attempt = await TestCandidateAttempt.findById(id).lean();
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });

    const test = await TestAssessment.findById(attempt.testId).lean();
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    return NextResponse.json({
      attempt: {
        id: attempt._id.toString(),
        candidate: attempt.candidate,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        tabSwitchCount: attempt.tabSwitchCount,
        violations: attempt.violations,
        answers: attempt.answers,
      },
      test: {
        id: test._id.toString(),
        title: test.title,
        instructions: test.instructions,
        durationMinutes: test.durationMinutes,
        questions: test.questions,
        proctoring: test.proctoring,
      },
    });
  } catch (error) {
    console.error('Get test attempt error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await dbConnect();

    const attempt = await TestCandidateAttempt.findById(id);
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    if (attempt.status === 'submitted' || attempt.status === 'terminated') {
      return NextResponse.json({ error: 'This attempt is already closed' }, { status: 409 });
    }

    if (body.action === 'start') {
      if (!attempt.startedAt) attempt.startedAt = new Date();
      attempt.status = 'in_progress';
    } else if (body.action === 'violation') {
      const allowed = ['tab_switch', 'fullscreen_exit', 'copy_paste', 'camera_lost', 'mic_lost'];
      if (!allowed.includes(body.type)) {
        return NextResponse.json({ error: 'Invalid violation type' }, { status: 400 });
      }
      attempt.violations.push({ type: body.type, timestamp: new Date(), details: body.details });
      if (body.type === 'tab_switch') {
        attempt.tabSwitchCount += 1;
        const test = await TestAssessment.findById(attempt.testId).select('proctoring');
        const maxTabSwitches = test?.proctoring?.maxTabSwitches ?? 3;
        if (maxTabSwitches > 0 && attempt.tabSwitchCount >= maxTabSwitches) {
          attempt.status = 'terminated';
          attempt.submittedAt = new Date();
        }
      }
    } else if (body.action === 'submit') {
      attempt.status = 'submitted';
      attempt.submittedAt = new Date();
      if (Array.isArray(body.answers)) attempt.answers = body.answers;
      attempt.totalScore = attempt.answers.reduce((total, answer) => total + (answer.score || 0), 0);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    await attempt.save();
    return NextResponse.json({
      success: true,
      status: attempt.status,
      tabSwitchCount: attempt.tabSwitchCount,
      submittedAt: attempt.submittedAt,
    });
  } catch (error) {
    console.error('Update test attempt error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
