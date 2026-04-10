import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import BattleModel from '@/lib/models/Battle';
import { UserModel } from '@/lib/models/User';
import dbConnect from '@/lib/dbConnect';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const url = new URL(request.url);
        const email = url.searchParams.get("email");

        if (!email) return NextResponse.json({ allowed: false }, { status: 400 });

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ allowed: false }, { status: 400 });
        }

        await dbConnect();

        const user = await UserModel.findOne({ email }).lean();
        if (!user) return NextResponse.json({ allowed: false }, { status: 404 });

        const battle = await BattleModel.findById(id).lean();
        if (!battle) return NextResponse.json({ allowed: false }, { status: 404 });

        const userId = user._id.toString();
        const p1 = battle.player1?.toString();
        const p2 = battle.player2?.toString();

        if (userId === p1 || userId === p2) {
            return NextResponse.json({ allowed: true });
        }

        return NextResponse.json({ allowed: false });
    } catch (error) {
        return NextResponse.json({ allowed: false }, { status: 500 });
    }
}
