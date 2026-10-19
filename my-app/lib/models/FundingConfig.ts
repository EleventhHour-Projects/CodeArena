import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFundingConfig extends Document {
  monthlySpendGoal: number; // in USD (default 5)
  manualTotalAmount: number; // in USD (default 0 or override amount)
  manualMonthlyAmount: number; // in USD (default 0 or override amount)
  overrideApiAmounts: boolean; // if true, replaces API amounts with manual amounts
  maintainerUsername: string; // GitHub maintainer to query (default: Not-Dhananjay-Mishra)
  customNotice?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FundingConfigSchema: Schema<IFundingConfig> = new Schema(
  {
    monthlySpendGoal: {
      type: Number,
      required: true,
      default: 5,
      min: 0.1,
    },
    manualTotalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    manualMonthlyAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    overrideApiAmounts: {
      type: Boolean,
      default: false,
    },
    maintainerUsername: {
      type: String,
      required: true,
      default: "Not-Dhananjay-Mishra",
      trim: true,
    },
    customNotice: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const FundingConfig: Model<IFundingConfig> =
  mongoose.models.FundingConfig ||
  mongoose.model<IFundingConfig>("FundingConfig", FundingConfigSchema, "funding_configs");

export default FundingConfig;
