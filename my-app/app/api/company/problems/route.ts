import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import fs from 'fs/promises';
import path from 'path';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-admin-key-code-arena'
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('company_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role !== 'company') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const questionsDir = path.join(process.cwd(), '..', 'questions');
    const difficulties = ['easy', 'medium', 'hard'];

    let allJsonFiles: { path: string; fileName: string; difficulty: string }[] = [];

    for (const diff of difficulties) {
      const diffDir = path.join(questionsDir, diff);
      try {
        const files = await fs.readdir(diffDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            allJsonFiles.push({ path: diffDir, fileName: file, difficulty: diff });
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    if (allJsonFiles.length === 0) {
      return NextResponse.json({ problems: [] });
    }

    const problems = await Promise.all(
      allJsonFiles.map(async (fileObj) => {
        const idStr = fileObj.fileName.replace('.json', '');
        const id = parseInt(idStr, 10);
        const filePath = path.join(fileObj.path, fileObj.fileName);

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const problemData = JSON.parse(fileContent);

        return {
          id,
          title: problemData.title || `Problem ${id}`,
          slug: problemData.slug || '',
          difficulty: (problemData.difficulty || fileObj.difficulty).toLowerCase(),
          tags: problemData.tags || [],
          description: problemData.description || '',
          input_format: problemData.input_format || '',
          output_format: problemData.output_format || '',
          constraints: problemData.constraints || '',
        };
      })
    );

    // Sort by ID
    problems.sort((a, b) => a.id - b.id);

    return NextResponse.json({ problems });
  } catch (error) {
    console.error('Error fetching company problems:', error);
    return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
  }
}
