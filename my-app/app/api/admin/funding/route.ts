import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import FundingConfig from "@/lib/models/FundingConfig";

export async function GET() {
  try {
    await dbConnect();

    let config = await FundingConfig.findOne();
    if (!config) {
      config = await FundingConfig.create({
        monthlySpendGoal: 5,
        manualTotalAmount: 0,
        manualMonthlyAmount: 0,
        overrideApiAmounts: false,
        maintainerUsername: "Not-Dhananjay-Mishra",
        customNotice: "",
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        monthlySpendGoal: config.monthlySpendGoal,
        manualTotalAmount: config.manualTotalAmount,
        manualMonthlyAmount: config.manualMonthlyAmount,
        runwayMonths: config.runwayMonths || 0,
        overrideApiAmounts: config.overrideApiAmounts,
        maintainerUsername: config.maintainerUsername,
        customNotice: config.customNotice || "",
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Admin Funding Config GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch funding config" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await dbConnect();

    const {
      monthlySpendGoal,
      manualTotalAmount,
      manualMonthlyAmount,
      runwayMonths,
      overrideApiAmounts,
      maintainerUsername,
      customNotice,
    } = body;

    const updateData: any = {};
    if (typeof monthlySpendGoal === "number" && monthlySpendGoal > 0) {
      updateData.monthlySpendGoal = monthlySpendGoal;
    }
    if (typeof manualTotalAmount === "number" && manualTotalAmount >= 0) {
      updateData.manualTotalAmount = manualTotalAmount;
    }
    if (typeof manualMonthlyAmount === "number" && manualMonthlyAmount >= 0) {
      updateData.manualMonthlyAmount = manualMonthlyAmount;
    }
    if (typeof runwayMonths === "number" && runwayMonths >= 0) {
      updateData.runwayMonths = runwayMonths;
    }
    if (typeof overrideApiAmounts === "boolean") {
      updateData.overrideApiAmounts = overrideApiAmounts;
    }
    if (typeof maintainerUsername === "string" && maintainerUsername.trim().length > 0) {
      updateData.maintainerUsername = maintainerUsername.trim();
    }
    if (typeof customNotice === "string") {
      updateData.customNotice = customNotice.trim();
    }

    const config = await FundingConfig.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Funding settings updated successfully",
      config: {
        monthlySpendGoal: config.monthlySpendGoal,
        manualTotalAmount: config.manualTotalAmount,
        manualMonthlyAmount: config.manualMonthlyAmount,
        runwayMonths: config.runwayMonths || 0,
        overrideApiAmounts: config.overrideApiAmounts,
        maintainerUsername: config.maintainerUsername,
        customNotice: config.customNotice || "",
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Admin Funding Config POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update funding config" },
      { status: 500 }
    );
  }
}
