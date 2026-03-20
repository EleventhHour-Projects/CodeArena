import fs from 'fs';
import path from 'path';
type BattleProblem = {
    difficulty: "easy" | "medium" | "hard";
    id: number;
};
export const assignBattleProblems = (difficulty: string): BattleProblem[] => {
    // Determine the number of questions needed from each difficulty
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    const diffLower = difficulty.toLowerCase();
    
    if (diffLower === 'easy') {
        easyCount = 2;
        mediumCount = 1;
    } else if (diffLower === 'medium') {
        mediumCount = 2;
        hardCount = 1;
    } else if (diffLower === 'hard') {
        mediumCount = 1;
        hardCount = 2;
    } else {
        throw new Error("Invalid difficulty level. Must be 'easy', 'medium', or 'hard'.");
    }

    const problemIds: BattleProblem[] = [];

    // Helper to fetch random unique problems from a dir
    const fetchRandomProblems = (level: "easy" | "medium" | "hard", count: number): BattleProblem[] => {
        if (count === 0) return [];
        
        // Try multiple potential relative paths for the questions folder
        const potentialPaths = [
            path.resolve(process.cwd(), '..', 'questions', level),
            path.resolve(process.cwd(), 'questions', level),
            path.join(process.cwd(), '../questions', level)
        ];

        let questionsDir = "";
        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                questionsDir = p;
                break;
            }
        }

        if (!questionsDir) {
            console.error(`ERROR: Questions directory not found for ${level}. Checked:`, potentialPaths);
            return [];
        }

        try {
            console.log(`Assigning problems from: ${questionsDir}`);
            const entries = fs.readdirSync(questionsDir, { withFileTypes: true });
            
            const availableIds = entries
                .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
                .map(entry => parseInt(entry.name.replace('.json', ''), 10))
                .filter(id => !isNaN(id));

            console.log(`Available ${level} problems:`, availableIds);

            if (availableIds.length < count) {
                console.warn(`Insufficient problems in ${level}. Requested: ${count}, Found: ${availableIds.length}`);
                return availableIds.map(id => ({ difficulty: level, id: Number(id) }));
            }

            const shuffled = [...availableIds].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count).map(id => ({ difficulty: level, id: Number(id) }));
        } catch (error) {
            console.error(`Fatalk error reading ${level} problems:`, error);
            return [];
        }
    };

    const easyProblems = fetchRandomProblems('easy', easyCount);
    const mediumProblems = fetchRandomProblems('medium', mediumCount);
    const hardProblems = fetchRandomProblems('hard', hardCount);

    problemIds.push(...easyProblems, ...mediumProblems, ...hardProblems);

    return problemIds;
};
