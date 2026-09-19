import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import Company from '@/lib/models/Company';

// GET /api/test/[link] — public endpoint: get test info by link UUID or ID
export async function GET(request: Request, { params }: { params: Promise<{ link: string }> }) {
  try {
    const { link } = await params;
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
    let timeStatus: 'upcoming' | 'active' | 'ended' = 'active';

    if (test.validFrom && now < new Date(test.validFrom)) {
      timeStatus = 'upcoming';
    } else if (test.validUntil && now > new Date(test.validUntil)) {
      timeStatus = 'ended';
    }

    return NextResponse.json({
      timeStatus,
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
