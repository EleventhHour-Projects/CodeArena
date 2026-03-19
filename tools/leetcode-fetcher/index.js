import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const QUESTIONS_DIR = path.resolve(__dirname, '../../questions');

async function fetchLeetCodeData(titleSlug) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        content
        difficulty
        exampleTestcases
        topicTags {
          name
        }
      }
    }
  `;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com/',
    },
    body: JSON.stringify({
      query,
      variables: { titleSlug },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from LeetCode: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.data || !data.data.question) {
    throw new Error('Problem not found or invalid response from LeetCode');
  }

  return data.data.question;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
}



function getNextId(difficulty) {
    const dir = path.join(QUESTIONS_DIR, difficulty.toLowerCase());
    let minId, maxId;
    
    if (difficulty.toLowerCase() === 'easy') {
        minId = 1; maxId = 299;
    } else if (difficulty.toLowerCase() === 'medium') {
        minId = 300; maxId = 599;
    } else if (difficulty.toLowerCase() === 'hard') {
        minId = 600; maxId = 899;
    } else {
        throw new Error("Invalid difficulty");
    }

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        return minId;
    }

    const files = fs.readdirSync(dir);
    let highestId = minId - 1;

    for (const file of files) {
        if (file.endsWith('.json')) {
            const id = parseInt(file.replace('.json', ''), 10);
            if (!isNaN(id) && id >= minId && id <= maxId) {
                if (id > highestId) {
                    highestId = id;
                }
            }
        }
    }

    const nextId = highestId + 1;
    if (nextId > maxId) {
        throw new Error(`ID limit reached for ${difficulty}`);
    }

    return nextId;
}

async function main() {
    const url = process.argv[2];
    if (!url) {
        console.error("Usage: node index.js <leetcode-url>");
        process.exit(1);
    }

    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const problemsIndex = pathParts.indexOf('problems');
        if (problemsIndex === -1 || !pathParts[problemsIndex + 1]) {
            throw new Error("Invalid LeetCode URL structure.");
        }
        const titleSlug = pathParts[problemsIndex + 1];

        console.log(`Fetching data for: ${titleSlug}...`);
        const leetcodeData = await fetchLeetCodeData(titleSlug);
        console.log(`Found: ${leetcodeData.title} (${leetcodeData.difficulty})`);

        // Removed Gemini rewriting for description as requested
        const newDescription = stripHtml(leetcodeData.content);

        // Skipped Gemini generation, using placeholders
        console.log("Using placeholder testcases...");
        const testCasesData = {
            "testcases": {
                "run": [
                    {
                        "input": "placeholder_input",
                        "output": "placeholder_output",
                        "explanation": "Add real testcases later"
                    }
                ],
                "submit": [
                    {
                        "input": "placeholder_input_submit",
                        "output": "placeholder_output_submit"
                    }
                ]
            }
        };

        const difficulty = leetcodeData.difficulty;
        const nextId = getNextId(difficulty);

        const questionJson = {
            id: nextId,
            slug: leetcodeData.titleSlug,
            tags: leetcodeData.topicTags.map(tag => tag.name),
            title: leetcodeData.title,
            difficulty: difficulty,
            description: newDescription,
            input_format: "Read from standard input. Format details depends on the problem.",
            output_format: "Print to standard output.",
            constraints: "Please read problem description for constraints." 
        };

        const questionDir = path.join(QUESTIONS_DIR, difficulty.toLowerCase());
        const testcaseDir = path.join(QUESTIONS_DIR, 'testcase');
        
        if (!fs.existsSync(testcaseDir)) {
            fs.mkdirSync(testcaseDir, { recursive: true });
        }

        const questionFilePath = path.join(questionDir, `${nextId}.json`);
        const testcaseFilePath = path.join(testcaseDir, `${nextId}.json`);

        fs.writeFileSync(questionFilePath, JSON.stringify(questionJson, null, 4));
        fs.writeFileSync(testcaseFilePath, JSON.stringify(testCasesData, null, 4));

        console.log(`✅ Successfully generated question! ID: ${nextId}`);
        console.log(`Question File: ${questionFilePath}`);
        console.log(`Testcase File: ${testcaseFilePath}`);

    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

main();
