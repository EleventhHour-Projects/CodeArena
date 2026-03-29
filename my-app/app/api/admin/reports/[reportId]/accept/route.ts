import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReportModel from "@/lib/models/Report";
import BattleModel from "@/lib/models/Battle";
import { UserModel } from "@/lib/models/User";
import mongoose from "mongoose";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ reportId: string }> | { reportId: string } }
) {
    await dbConnect();
    const session = await mongoose.startSession();
    let isSuccess = false;
    let errorMessage = "Internal server error";

    try {
        await session.withTransaction(async () => {
            // @ts-ignore
            const params = await context.params;
            const reportId = params.reportId;

            const report = await ReportModel.findById(reportId).session(session);
            if (!report) {
                throw new Error("Report not found");
            }

            if (report.status !== "Pending") {
                throw new Error("Report is already processed");
            }

            // Mark report as accepted
            report.status = "Accepted";
            await report.save({ session });

            const battle = await BattleModel.findById(report.battleId).session(session);
            if (!battle) {
                // If battle doesn't exist anymore, just return success since report is accepted
                return;
            }

            const reporter = await UserModel.findById(report.reporter).session(session);
            const reported = await UserModel.findById(report.reported).session(session);

            if (reporter && reported && battle.status === "Completed") {
                // Revert rating changes
                const ratingChangeA = battle.ratingChangeA ?? 0;
                const ratingChangeB = battle.ratingChangeB ?? 0;

                // Who is who?
                if (battle.player1.toString() === reporter._id.toString()) {
                    // reporter is A
                    reporter.rating = Math.max(0, (reporter.rating ?? 0) - ratingChangeA);
                    reported.rating = 0;
                } else if (battle.player2.toString() === reporter._id.toString()) {
                    // reporter is B
                    reporter.rating = Math.max(0, (reporter.rating ?? 0) - ratingChangeB);
                    reported.rating = 0;
                }
                
                await reporter.save({ session });
                await reported.save({ session });
            }
        });
        isSuccess = true;
    } catch (err: any) {
        console.error("Accept Report Error:", err);
        errorMessage = err.message || errorMessage;
    } finally {
        session.endSession();
    }

    if (isSuccess) {
        return NextResponse.json({ success: true, message: "Report accepted, rating updated" }, { status: 200 });
    } else {
        return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }
}
