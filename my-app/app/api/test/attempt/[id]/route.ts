import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import TestCandidateAttempt from '@/lib/models/TestCandidateAttempt';
import Company from '@/lib/models/Company';

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

    const company = await Company.findById(test.companyId).select('name logo website description').lean();

    // Enrich questions with full descriptions and non-hidden sample testcases
    const questionsDir = path.join(process.cwd(), '..', 'questions');

    const enrichedQuestions = await Promise.all(
      test.questions.map(async (q) => {
        let fullDescription = '';
        let inputFormat = '';
        let outputFormat = '';
        let constraints = '';
        let sampleTestcases: { input: string; output: string; explanation?: string }[] = [];

        const diff = (q.difficulty || 'easy').toLowerCase();
        try {
          const filePath = path.join(questionsDir, diff, `${q.problemId}.json`);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const pData = JSON.parse(fileContent);
          fullDescription = pData.description || '';
          inputFormat = pData.input_format || '';
          outputFormat = pData.output_format || '';
          constraints = pData.constraints || '';
        } catch {
          // Problem JSON missing or unreadable
        }

        try {
          const tcPath = path.join(questionsDir, 'testcase', `${q.problemId}.json`);
          const tcContent = await fs.readFile(tcPath, 'utf-8');
          const tcData = JSON.parse(tcContent);
          if (tcData.testcases?.run && Array.isArray(tcData.testcases.run)) {
            sampleTestcases = tcData.testcases.run;
          } else if (Array.isArray(tcData.testcases)) {
            sampleTestcases = tcData.testcases.slice(0, 2);
          }
        } catch {
          // Testcase JSON missing
        }

        return {
          problemId: q.problemId,
          title: q.title || `Problem #${q.problemId}`,
          difficulty: q.difficulty || 'medium',
          points: q.points || 10,
          description: fullDescription,
          inputFormat,
          outputFormat,
          constraints,
          sampleTestcases,
        };
      })
    );

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
        totalScore: attempt.totalScore || 0,
        maxScore: attempt.maxScore || test.questions.reduce((sum, q) => sum + (q.points || 0), 0),
        feedback: attempt.feedback || null,
      },
      test: {
        id: test._id.toString(),
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        testLink: test.testLink,
        durationMinutes: test.durationMinutes,
        questions: enrichedQuestions,
        proctoring: test.proctoring,
        validUntil: test.validUntil,
      },
      company: company
        ? {
            name: company.name,
            logo: company.logo,
            website: company.website,
            description: company.description,
          }
        : null,
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

    if (body.action === 'start') {
      if (attempt.status === 'submitted' || attempt.status === 'terminated') {
        return NextResponse.json({ error: 'This attempt is already closed' }, { status: 409 });
      }
      if (!attempt.startedAt) attempt.startedAt = new Date();
      attempt.status = 'in_progress';
    } else if (body.action === 'violation') {
      if (attempt.status === 'submitted' || attempt.status === 'terminated') {
        return NextResponse.json({ error: 'Attempt is closed' }, { status: 409 });
      }
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
    } else if (body.action === 'answer') {
      if (attempt.status === 'submitted' || attempt.status === 'terminated') {
        return NextResponse.json({ error: 'Attempt is closed' }, { status: 409 });
      }
      // Save or update an answer for a question
      const { problemId, code, language, status, score, execCodeId } = body;
      const existingIdx = attempt.answers.findIndex((a) => a.problemId === problemId);
      if (existingIdx >= 0) {
        attempt.answers[existingIdx] = {
          problemId,
          code: code ?? attempt.answers[existingIdx].code,
          language: language ?? attempt.answers[existingIdx].language,
          status: status ?? attempt.answers[existingIdx].status,
          score: score !== undefined ? score : attempt.answers[existingIdx].score,
          submittedAt: new Date(),
          execCodeId: execCodeId ?? attempt.answers[existingIdx].execCodeId,
        };
      } else {
        attempt.answers.push({
          problemId,
          code: code || '',
          language: language || 'cpp',
          status: status || 'Pending',
          score: score || 0,
          submittedAt: new Date(),
          execCodeId,
        });
      }
      attempt.totalScore = attempt.answers.reduce((tot, ans) => tot + (ans.score || 0), 0);
    } else if (body.action === 'submit') {
      if (attempt.status !== 'terminated') {
        attempt.status = 'submitted';
      }
      if (!attempt.submittedAt) {
        attempt.submittedAt = new Date();
      }
      if (Array.isArray(body.answers)) {
        attempt.answers = body.answers;
      }
      attempt.totalScore = attempt.answers.reduce((total, answer) => total + (answer.score || 0), 0);

      // Save feedback if provided in final submit
      if (body.feedback && typeof body.feedback.rating === 'number') {
        attempt.feedback = {
          rating: body.feedback.rating,
          difficultyRating: body.feedback.difficultyRating || 'just_right',
          comments: body.feedback.comments || '',
          submittedAt: new Date(),
        };
      }
    } else if (body.action === 'feedback') {
      // Standalone feedback submission
      if (typeof body.rating === 'number') {
        attempt.feedback = {
          rating: body.rating,
          difficultyRating: body.difficultyRating || 'just_right',
          comments: body.comments || '',
          submittedAt: new Date(),
        };
      }
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    await attempt.save();
    return NextResponse.json({
      success: true,
      status: attempt.status,
      totalScore: attempt.totalScore,
      tabSwitchCount: attempt.tabSwitchCount,
      submittedAt: attempt.submittedAt,
      feedback: attempt.feedback,
    });
  } catch (error) {
    console.error('Update test attempt error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
