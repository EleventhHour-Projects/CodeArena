import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import BattleModel from "@/lib/models/Battle";

export async function POST(req: Request) {
    await dbConnect();

    try {
        const { battleId, userId } = await req.json();

        if (!battleId || !userId) {
            return NextResponse.json({ success: false, message: "Missing battleId or userId" }, { status: 400 });
        }

        const battle = await BattleModel.findById(battleId);
        if (!battle) {
            return NextResponse.json({ success: false, message: "Battle not found" }, { status: 404 });
        }

        if (battle.status !== "Active") {
            return NextResponse.json({ success: false, message: "Battle is not active" }, { status: 400 });
        }

        const isPlayer1 = String(battle.player1) === String(userId);
        const isPlayer2 = String(battle.player2) === String(userId);

        if (!isPlayer1 && !isPlayer2) {
            return NextResponse.json({ success: false, message: "User is not part of this battle" }, { status: 403 });
        }

        const currentCount = isPlayer1 ? (battle.drawOffersA || 0) : (battle.drawOffersB || 0);

        if (currentCount >= 2) {
            return NextResponse.json({ success: false, message: "Maximum draw offers reached" }, { status: 400 });
        }

        if (isPlayer1) {
            battle.drawOffersA = (battle.drawOffersA || 0) + 1;
        } else {
            battle.drawOffersB = (battle.drawOffersB || 0) + 1;
        }

        await battle.save();

        return NextResponse.json({ 
            success: true, 
            count: isPlayer1 ? battle.drawOffersA : battle.drawOffersB 
        });
    } catch (error) {
        console.error("Draw offer error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
