import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ExecutionCodeModel from '@/lib/models/ExecutionCode';
import { redisClientPromise } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    await dbConnect();

    // In a real app, I'd check for admin session here.
    // For now, I'll proceed as this is an internal admin-only page.

    const body = await request.json();
    const { code, language, problemId, difficulty, testcases } = body;

    if (!code || !problemId || !difficulty || !testcases) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const redisClient = await redisClientPromise;

    // Create a temporary execution record
    const executionCode = new ExecutionCodeModel({
      code,
      language: language || 'cpp',
      userId: "60d0fe4f5311236168a109ca", // Placeholder Admin ID or fetch from session
      problem: { difficulty, id: problemId },
      testcases: testcases, // These are the cases to run against
      status: "Pending",
      type: "Verify"
    });

    await executionCode.save();

    // Push to Redis queue
    await redisClient.set(`executionCode:${executionCode._id}`, JSON.stringify(executionCode));
    await redisClient.rPush('tasks', executionCode._id.toString());

    return NextResponse.json({ success: true, execId: executionCode._id });
  } catch (error: any) {
    console.error('Error in verify-problem:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
