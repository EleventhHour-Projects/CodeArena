import fs from 'fs';
import path from 'path';

export function getQuestionsDir(): string {
  if (process.env.QUESTIONS_DIR && fs.existsSync(process.env.QUESTIONS_DIR)) {
    return process.env.QUESTIONS_DIR;
  }
  const candidates = [
    path.resolve(process.cwd(), '..', 'questions'),
    path.resolve(process.cwd(), 'questions'),
    '/questions',
    path.join(process.cwd(), '../questions')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), '..', 'questions');
}
