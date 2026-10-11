import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getQuestionsDir } from '@/lib/problems/getQuestionsDir';

export async function POST(request: Request) {
  try {
    const { problemId, difficulty, verified } = await request.json();

    if (!problemId || !difficulty) {
      return NextResponse.json({ error: 'Problem ID and difficulty are required' }, { status: 400 });
    }

    const questionsDir = getQuestionsDir();
    const filePath = path.join(questionsDir, difficulty.toLowerCase(), `${problemId}.json`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (e) {
      return NextResponse.json({ error: 'Problem file not found' }, { status: 404 });
    }

    // Read current content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const problemData = JSON.parse(fileContent);

    // Update verified status
    problemData.verified = verified;

    // Save back to file
    await fs.writeFile(filePath, JSON.stringify(problemData, null, 2), 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: `Problem ${problemId} updated successfully`,
      verified: problemData.verified
    });
  } catch (error) {
    console.error('Error updating problem verification:', error);
    return NextResponse.json(
      { error: 'Failed to update problem' },
      { status: 500 }
    );
  }
}
