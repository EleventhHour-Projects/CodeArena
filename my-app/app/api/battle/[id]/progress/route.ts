import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import SubmissionModel from '@/lib/models/Submission';
import BattleModel from '@/lib/models/Battle';
import dbConnect from '@/lib/dbConnect';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid battle ID format' }, { status: 400 });
        }

        await dbConnect();

        // 1. Find the battle to get player IDs
        const battle = await BattleModel.findById(id).lean();
        if (!battle) {
            return NextResponse.json({ success: false, error: 'Battle not found' }, { status: 404 });
        }

        // 2. Query all accepted submissions for this battle
        // We filter by battleId and status "Accepted"
        const submissions = await SubmissionModel.find({
            battleId: new mongoose.Types.ObjectId(id),
            status: "Accepted"
        }).select('userId problem.id').lean();

        // 3. Group unique solved problem IDs by player
        const p1Solved = new Set<number>();
        const p2Solved = new Set<number>();

        const p1Id = battle.player1.toString();
        const p2Id = battle.player2.toString();

        submissions.forEach((sub: any) => {
            const uidStr = sub.userId.toString();
            if (uidStr === p1Id) {
                p1Solved.add(sub.problem.id);
            } else if (uidStr === p2Id) {
                p2Solved.add(sub.problem.id);
            }
        });

        return NextResponse.json({
            success: true,
            player1Solved: Array.from(p1Solved),
            player2Solved: Array.from(p2Solved)
        });

    } catch (error) {
        console.error('Error fetching battle progress:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error while fetching progress' },
            { status: 500 }
        );
    }
}
