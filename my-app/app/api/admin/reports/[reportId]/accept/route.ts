import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReportModel from "@/lib/models/Report";
import BattleModel from "@/lib/models/Battle";
import { UserModel } from "@/lib/models/User";
import { NotificationModel } from "@/lib/models/Notification";
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
                    reporter.rating = (reporter.rating ?? 0) - ratingChangeA;
                    reported.rating = (reported.rating ?? 0) - 100;
                } else if (battle.player2.toString() === reporter._id.toString()) {
                    // reporter is B
                    reporter.rating = (reporter.rating ?? 0) - ratingChangeB;
                    reported.rating = (reported.rating ?? 0) - 100;
                }
                
                await reporter.save({ session });
                await reported.save({ session });

                // Create notifications
                await NotificationModel.create([{
                    userId: reporter._id,
                    message: "Thank you for reporting. The opponent has been penalized -100 in rating and your rating has been reverted.",
                    type: "report_accepted"
                }], { session });

                const battleDate = battle.createdAt ? new Date(battle.createdAt).toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                }) : 'Unknown Date';

                await NotificationModel.create([{
                    userId: reported._id,
                    message: `You were suspected of using AI tools in the battle against ${reporter.username} on ${battleDate}, so unfortunately ur rating has been penalized with -100. Its crucial to maintain fairness among battles`,
                    type: "report_accepted"
                }], { session });
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
