import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count') || '3';
    const count = parseInt(countParam, 10);

    // Path to the questions directory
    const questionsDir = path.join(process.cwd(), '..', 'questions');
    
    // Read all files in the directory
    const files = await fs.readdir(questionsDir);
    
    // Filter for JSON files
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      return NextResponse.json({ error: 'No questions found' }, { status: 404 });
    }

    // Shuffle the files array to get random questions
    const shuffledFiles = [...jsonFiles].sort(() => 0.5 - Math.random());
    
    // Select the requested number of questions (or all if fewer exist)
    const selectedFiles = shuffledFiles.slice(0, Math.min(count, shuffledFiles.length));
    
    // Read the content of the selected files
    const problems = await Promise.all(
      selectedFiles.map(async (fileName) => {
        const filePath = path.join(questionsDir, fileName);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const problemData = JSON.parse(fileContent);
        return {
          id: fileName.replace('.json', ''),
          ...problemData
        };
      })
    );

    return NextResponse.json({ problems });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
