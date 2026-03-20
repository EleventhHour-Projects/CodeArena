import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count') || '3';
    const count = parseInt(countParam, 10);
    const idsParam = searchParams.get('ids');

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

    let selectedFiles: { path: string, fileName: string }[] = [];

    if (idsParam) {
      const explicitIds = idsParam.split(',').map(id => id.trim());
      selectedFiles = allJsonFiles.filter(f => explicitIds.includes(f.fileName.replace('.json', '')));
    } else {
      const shuffledFiles = [...allJsonFiles].sort(() => 0.5 - Math.random());
      selectedFiles = shuffledFiles.slice(0, Math.min(count, shuffledFiles.length));
    }

    const problems = await Promise.all(
      selectedFiles.map(async (fileObj) => {
        const idStr = fileObj.fileName.replace('.json', '');
        const id = parseInt(idStr, 10);
        const filePath = path.join(fileObj.path, fileObj.fileName);
        
        console.log(`Reading problem file: ${filePath}`);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const problemData = JSON.parse(fileContent);

        // Fetch testcases from the separate testcase directory
        let testcases = null;
        try {
          const testcasePath = path.resolve(questionsDir, 'testcase', `${idStr}.json`);
          console.log(`Checking testcase file: ${testcasePath}`);
          if (await fs.stat(testcasePath).then(() => true).catch(() => false)) {
            const testcaseContent = await fs.readFile(testcasePath, 'utf-8');
            const testcaseData = JSON.parse(testcaseContent);
            testcases = testcaseData.testcases;
            console.log(`Found testcases for problem ${id}`);
          }
        } catch (e) {
          console.warn(`Error reading testcase for problem ${id}:`, e);
        }

        return {
          ...problemData,
          id, // Overwrite with numerical ID
          testcases
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
