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
        
        const questionsDir = path.join(process.cwd(), '../questions', level);
        
        try {
            // Read directories in the level folder (e.g. "1", "2")
            if (!fs.existsSync(questionsDir)) {
                console.warn(`Directory not found: ${questionsDir}`);
                return [];
            }

            const entries = fs.readdirSync(questionsDir, { withFileTypes: true });
            
            // Filter directories and parse their names into integers
            const availableIds = entries
                .filter(entry => entry.isDirectory())
                .map(entry => parseInt(entry.name, 10))
                .filter(id => !isNaN(id));

            if (availableIds.length < count) {
                console.warn(`Not enough problems in ${level}. Requested: ${count}, Available: ${availableIds.length}`);
                // If we don't have enough problems, just turn it back shuffled
                return availableIds.sort(() => 0.5 - Math.random()).map(id => ({ difficulty: level, id }));
            }

            // Shuffle and pick exactly 'count' problems
            const shuffled = availableIds.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count).map(id => ({ difficulty: level, id }));
        } catch (error) {
            console.error(`Error reading ${level} problems directory:`, error);
            return [];
        }
    };

    const easyProblems = fetchRandomProblems('easy', easyCount);
    const mediumProblems = fetchRandomProblems('medium', mediumCount);
    const hardProblems = fetchRandomProblems('hard', hardCount);

    problemIds.push(...easyProblems, ...mediumProblems, ...hardProblems);

    return problemIds;
};
