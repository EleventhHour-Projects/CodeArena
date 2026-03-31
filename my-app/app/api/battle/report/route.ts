import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import { UserModel } from "@/lib/models/User";
import ReportModel from "@/lib/models/Report";
import BattleModel from "@/lib/models/Battle";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { reportedId, battleId, reason, category = "Other" } = body;
        
        // Validation logic
        if (!reason) {
            return NextResponse.json({ success: false, message: "Reason is required" }, { status: 400 });
        }

        if (category === "Cheating") {
            if (!reportedId || !battleId) {
                return NextResponse.json({ success: false, message: "Reported user and battle ID are required for cheating reports" }, { status: 400 });
            }
        }

        await dbConnect();

        const reporterUser = await UserModel.findOne({ email: session.user.email });
        if (!reporterUser) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        // Only check for duplicates for cheating reports to avoid blocking multi-bug reports
        if (category === "Cheating") {
            const existingReport = await ReportModel.findOne({ 
                reporter: reporterUser._id, 
                reported: reportedId, 
                battleId,
                category: "Cheating"
            });
            if (existingReport) {
                return NextResponse.json({ success: false, message: "You have already reported this user for this battle" }, { status: 400 });
            }
        }

        const report = new ReportModel({
            reporter: reporterUser._id,
            reported: reportedId || null,
            battleId: battleId || null,
            reason,
            category,
            status: "Pending"
        });

        await report.save();

        return NextResponse.json({ success: true, message: "Report submitted successfully" }, { status: 201 });
    } catch (error) {
        console.error("Error submitting report:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
