import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import Company from '@/lib/models/Company';

// GET /api/test/[link] — public endpoint: get test info by link UUID
export async function GET(request: Request, { params }: { params: Promise<{ link: string }> }) {
  try {
    const { link } = await params;
    await dbConnect();

    const test = await TestAssessment.findOne({ testLink: link, status: 'active' });
    if (!test) {
      return NextResponse.json({ error: 'Test not found or no longer active' }, { status: 404 });
    }

    // Check validity window
    const now = new Date();
    if (test.validFrom && now < test.validFrom) {
      return NextResponse.json({ error: 'Test has not started yet' }, { status: 403 });
    }
    if (test.validUntil && now > test.validUntil) {
      return NextResponse.json({ error: 'Test link has expired' }, { status: 403 });
    }

    const company = await Company.findById(test.companyId).select('name logo website description');

    return NextResponse.json({
      test: {
        id: test._id.toString(),
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        durationMinutes: test.durationMinutes,
        validFrom: test.validFrom,
        validUntil: test.validUntil,
        questionCount: test.questions.length,
        proctoring: test.proctoring,
      },
      company: {
        name: company?.name,
        logo: company?.logo,
        website: company?.website,
        description: company?.description,
      },
    });
  } catch (error: any) {
    console.error('GET test link error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
