import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

        const battle = await BattleModel.findById(id).lean();

        if (!battle) {
            return NextResponse.json({ success: false, error: 'Battle not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, battle });
    } catch (error) {
        console.error('Error fetching battle details:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error while fetching battle details' },
            { status: 500 }
        );
    }
}
