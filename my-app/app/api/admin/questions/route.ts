import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const questionsDir = path.join(process.cwd(), '..', 'questions');
    const difficulties = ['easy', 'medium', 'hard'];
    
    let allJsonFiles: { path: string, fileName: string }[] = [];

    for (const diff of difficulties) {
      const diffDir = path.join(questionsDir, diff);
      try {
        const files = await fs.readdir(diffDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            allJsonFiles.push({ path: diffDir, fileName: file });
          }
        }
      } catch (e) {
        // Directory might not exist, silently ignore
      }
    }

    if (allJsonFiles.length === 0) {
      return NextResponse.json({ error: 'No questions found' }, { status: 404 });
    }

    const problems = await Promise.all(
      allJsonFiles.map(async (fileObj) => {
        const idStr = fileObj.fileName.replace('.json', '');
        const id = parseInt(idStr, 10);
        const filePath = path.join(fileObj.path, fileObj.fileName);
        
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const problemData = JSON.parse(fileContent);

        // Fetch testcases from the separate testcase directory
        let testcases = null;
        try {
          const testcasePath = path.resolve(questionsDir, 'testcase', `${idStr}.json`);
          if (await fs.stat(testcasePath).then(() => true).catch(() => false)) {
            const testcaseContent = await fs.readFile(testcasePath, 'utf-8');
            const testcaseData = JSON.parse(testcaseContent);
            const rawTestcases = testcaseData.testcases;
            if (Array.isArray(rawTestcases)) {
              testcases = rawTestcases;
            } else if (rawTestcases && typeof rawTestcases === 'object') {
              testcases = [...(rawTestcases.run || []), ...(rawTestcases.submit || [])];
            }
          }
        } catch (e) {
          // No testcases found
        }

        return {
          ...problemData,
          id,
          testcases
        };
      })
    );

    // Sort by ID for better list display
    problems.sort((a, b) => a.id - b.id);

    return NextResponse.json({ problems });
  } catch (error) {
    console.error('Error fetching admin questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
