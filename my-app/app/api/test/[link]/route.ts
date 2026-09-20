import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import Company from '@/lib/models/Company';
import TestCandidateAttempt from '@/lib/models/TestCandidateAttempt';

// GET /api/test/[link] — public endpoint: get test info by link UUID or ID
export async function GET(request: Request, { params }: { params: Promise<{ link: string }> }) {
  try {
    const { link } = await params;
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    await dbConnect();

    let test = await TestAssessment.findOne({ testLink: link });
    if (!test && mongoose.Types.ObjectId.isValid(link)) {
      test = await TestAssessment.findById(link);
    }

    if (!test) {
      return NextResponse.json(
        { error: 'Assessment not found. Please verify your link URL.' },
        { status: 404 }
      );
    }

    if (test.status === 'archived') {
      return NextResponse.json(
        { error: 'This assessment has been archived by the organization.' },
        { status: 410 }
      );
    }

    const company = await Company.findById(test.companyId).select('name logo website description email');

    const now = new Date();
    const nowTime = now.getTime();
    let timeStatus: 'upcoming' | 'active' | 'ended' = 'active';

    let startsInSeconds: number | null = null;
    let endsInSeconds: number | null = null;

    if (test.validFrom) {
      const fromTime = new Date(test.validFrom).getTime();
      if (nowTime < fromTime) {
        timeStatus = 'upcoming';
        startsInSeconds = Math.max(0, Math.floor((fromTime - nowTime) / 1000));
      }
    }

    if (test.validUntil) {
      const untilTime = new Date(test.validUntil).getTime();
      if (nowTime > untilTime) {
        timeStatus = 'ended';
      } else {
        endsInSeconds = Math.max(0, Math.floor((untilTime - nowTime) / 1000));
      }
    }

    // Check if token matches an invited candidate
    let invitedCandidate = null;
    let alreadyAttempted = false;
    if (token && Array.isArray((test as any).invitedCandidates)) {
      const found = (test as any).invitedCandidates.find((c: any) => c.token === token);
      if (found) {
        invitedCandidate = {
          email: found.email,
          name: found.name || '',
          token: found.token,
          status: found.status || 'pending',
        };

        // Check if this candidate has already completed the assessment
        const existingAttempt = await TestCandidateAttempt.findOne({
          testId: test._id,
          'candidate.email': found.email.toLowerCase(),
          status: { $in: ['submitted', 'terminated'] },
        }).lean();

        if (existingAttempt) {
          alreadyAttempted = true;
        }
      }
    }

    return NextResponse.json({
      timeStatus,
      serverTime: now.toISOString(),
      startsInSeconds,
      endsInSeconds,
      invitedCandidate,
      alreadyAttempted,
      isDraft: test.status === 'draft',
      test: {
        id: test._id.toString(),
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        durationMinutes: test.durationMinutes,
        validFrom: test.validFrom,
        validUntil: test.validUntil,
        questionCount: test.questions?.length || 0,
        proctoring: test.proctoring || {},
        registrationForm: test.registrationForm || {
          phone: { enabled: true, required: false },
          rollNumber: { enabled: true, required: false },
          college: { enabled: true, required: false },
        },
        status: test.status,
      },
      company: {
        name: company?.name || 'Organization',
        logo: company?.logo || '',
        website: company?.website || '',
        description: company?.description || '',
        email: company?.email || '',
      },
    });
  } catch (error: any) {
    console.error('GET test link error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
