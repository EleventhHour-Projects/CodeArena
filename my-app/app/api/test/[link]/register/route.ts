import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import TestAssessment from '@/lib/models/TestAssessment';
import TestCandidateAttempt from '@/lib/models/TestCandidateAttempt';

// POST /api/test/[link]/register — register candidate for test
export async function POST(request: Request, { params }: { params: Promise<{ link: string }> }) {
  try {
    const { link } = await params;
    await dbConnect();

    let test = await TestAssessment.findOne({ testLink: link });
    if (!test && mongoose.Types.ObjectId.isValid(link)) {
      test = await TestAssessment.findById(link);
    }

    if (!test) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (test.status === 'archived') {
      return NextResponse.json({ error: 'Assessment is archived' }, { status: 410 });
    }

    const now = new Date();
    if (test.validFrom && now < new Date(test.validFrom)) {
      return NextResponse.json(
        { error: `Assessment has not started yet. It starts at ${new Date(test.validFrom).toLocaleString()}` },
        { status: 403 }
      );
    }
    if (test.validUntil && now > new Date(test.validUntil)) {
      return NextResponse.json(
        { error: `Assessment expired on ${new Date(test.validUntil).toLocaleString()}` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      rollNumber,
      phone,
      college,
      graduationYear,
      degree,
      github,
      linkedin,
      resumeUrl,
      experience,
      customData,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Dynamic field validation against company registration form config
    const rf = test.registrationForm;
    if (rf) {
      if (rf.phone?.enabled && rf.phone?.required && !phone?.trim()) {
        return NextResponse.json({ error: 'Phone number is required by the organization' }, { status: 400 });
      }
      if (rf.rollNumber?.enabled && rf.rollNumber?.required && !rollNumber?.trim()) {
        return NextResponse.json({ error: 'Roll number / Student ID is required' }, { status: 400 });
      }
      if (rf.college?.enabled && rf.college?.required && !college?.trim()) {
        return NextResponse.json({ error: 'College / Institute name is required' }, { status: 400 });
      }
      if (rf.graduationYear?.enabled && rf.graduationYear?.required && !graduationYear?.trim()) {
        return NextResponse.json({ error: 'Graduation year is required' }, { status: 400 });
      }
      if (rf.degree?.enabled && rf.degree?.required && !degree?.trim()) {
        return NextResponse.json({ error: 'Degree / Branch is required' }, { status: 400 });
      }
      if (rf.github?.enabled && rf.github?.required && !github?.trim()) {
        return NextResponse.json({ error: 'GitHub profile URL is required' }, { status: 400 });
      }
      if (rf.linkedin?.enabled && rf.linkedin?.required && !linkedin?.trim()) {
        return NextResponse.json({ error: 'LinkedIn profile URL is required' }, { status: 400 });
      }
      if (rf.resumeUrl?.enabled && rf.resumeUrl?.required && !resumeUrl?.trim()) {
        return NextResponse.json({ error: 'Resume link is required' }, { status: 400 });
      }
      if (rf.experience?.enabled && rf.experience?.required && !experience?.trim()) {
        return NextResponse.json({ error: 'Work experience is required' }, { status: 400 });
      }
    }

    // Check for existing attempt
    const existingAttempt = await TestCandidateAttempt.findOne({
      testId: test._id,
      'candidate.email': email.toLowerCase().trim(),
    });

    if (existingAttempt) {
      if (existingAttempt.status === 'submitted' || existingAttempt.status === 'terminated') {
        return NextResponse.json({ error: 'You have already completed this assessment' }, { status: 409 });
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
      candidate: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        rollNumber: rollNumber?.trim(),
        phone: phone?.trim(),
        college: college?.trim(),
        graduationYear: graduationYear?.trim(),
        degree: degree?.trim(),
        github: github?.trim(),
        linkedin: linkedin?.trim(),
        resumeUrl: resumeUrl?.trim(),
        experience: experience?.trim(),
        customData,
      },
      maxScore: test.questions.reduce((sum, q) => sum + (q.points || 0), 0),
      status: 'registered',
    });

    return NextResponse.json({ attemptId: attempt._id.toString(), status: 'registered' }, { status: 201 });
  } catch (error: any) {
    console.error('Register candidate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
