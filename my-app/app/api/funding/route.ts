import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import FundingConfig from "@/lib/models/FundingConfig";

const DEPLOY_SERVER_BASE_URL = process.env.DEPLOY_SERVER_BASE_URL || "http://localhost:8080";
const DEFAULT_MAINTAINER = "Not-Dhananjay-Mishra";
const DEFAULT_MONTHLY_GOAL = 5; // $5.00/mo server spend

export interface PublicSponsor {
  login: string;
  name: string;
  is_anonymous: boolean;
  avatar_url: string;
  profile_url: string;
  created_at: string;
  active: boolean;
}

export interface FundingResponse {
  success: boolean;
  username: string;
  monthlySpendGoal: number; // in USD (e.g. 5)
  monthlyAmount: number; // in USD for this month (e.g. 0 or 5)
  totalAmount: number; // in USD total collection (e.g. 100)
  currency: string;
  currentMonth: string;
  sponsorCount: number;
  runwayMonths: number;
  remainingMonthly: number;
  monthlyFundedPercent: number;
  isMonthlyGoalMet: boolean;
  customNotice?: string;
  sponsors: PublicSponsor[];
  sponsorUrl: string;
}

export async function GET() {
  try {
    // 1. Fetch Admin Configuration from MongoDB
    let monthlySpendGoal = DEFAULT_MONTHLY_GOAL;
    let manualTotalAmount = 0;
    let manualMonthlyAmount = 0;
    let configuredRunway = 0;
    let overrideApiAmounts = false;
    let maintainerUsername = DEFAULT_MAINTAINER;
    let customNotice = "";

    try {
      await dbConnect();
      const config = await FundingConfig.findOne();
      if (config) {
        monthlySpendGoal = config.monthlySpendGoal || DEFAULT_MONTHLY_GOAL;
        manualTotalAmount = config.manualTotalAmount || 0;
        manualMonthlyAmount = config.manualMonthlyAmount || 0;
        configuredRunway = typeof config.runwayMonths === "number" ? config.runwayMonths : 0;
        overrideApiAmounts = !!config.overrideApiAmounts;
        maintainerUsername = config.maintainerUsername?.trim() || DEFAULT_MAINTAINER;
        customNotice = config.customNotice || "";
      }
    } catch (dbErr) {
      console.warn("DB fetch failed for funding config, using defaults:", dbErr);
    }

    // 2. Fetch maintainer's sponsorship data from API provider
    const [listRes, totalRes, monthRes] = await Promise.allSettled([
      fetch(`${DEPLOY_SERVER_BASE_URL}/api/sponsors/${maintainerUsername}`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${DEPLOY_SERVER_BASE_URL}/api/sponsors/${maintainerUsername}/total`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${DEPLOY_SERVER_BASE_URL}/api/sponsors/${maintainerUsername}/month`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    const listData = listRes.status === "fulfilled" ? listRes.value : null;
    const totalData = totalRes.status === "fulfilled" ? totalRes.value : null;
    const monthData = monthRes.status === "fulfilled" ? monthRes.value : null;

    const apiMonthlyDollars =
      ((monthData?.monthly_amount_cents ?? totalData?.monthly_amount_cents ?? 0) / 100);
    const apiTotalDollars = ((totalData?.total_amount_cents ?? 0) / 100);
    const apiSponsorCount = listData?.count ?? totalData?.sponsor_count ?? 0;
    const currency = monthData?.currency || totalData?.currency || "USD";
    const currentMonth = monthData?.month || new Date().toISOString().slice(0, 7);

    // 3. Calculate final amounts based on admin config & overrides
    let totalAmount = overrideApiAmounts
      ? manualTotalAmount
      : Number((apiTotalDollars + manualTotalAmount).toFixed(2));

    let monthlyAmount = overrideApiAmounts
      ? manualMonthlyAmount
      : Number((apiMonthlyDollars + manualMonthlyAmount).toFixed(2));

    const remainingMonthly = Math.max(0, Number((monthlySpendGoal - monthlyAmount).toFixed(2)));
    const monthlyFundedPercent = Math.min(
      100,
      Math.round((monthlyAmount / monthlySpendGoal) * 100)
    );
    const isMonthlyGoalMet = monthlyAmount >= monthlySpendGoal;

    // Runway calculation:
    // If admin set runwayMonths directly, use it; otherwise fallback to totalAmount / monthlySpendGoal
    const calculatedRunway = monthlySpendGoal > 0
      ? Number((totalAmount / monthlySpendGoal).toFixed(1))
      : 0;
    const runwayMonths = configuredRunway > 0 ? configuredRunway : calculatedRunway;

    // 4. Parse Sponsors & Handle Anonymous case (empty username "")
    const rawSponsors = Array.isArray(listData?.sponsors) ? listData.sponsors : [];
    const publicSponsors: PublicSponsor[] = rawSponsors.map(
      (s: { login?: string; name?: string; created_at?: string; active?: boolean }) => {
        const rawLogin = typeof s.login === "string" ? s.login.trim() : "";
        const isAnonymous =
          rawLogin.length === 0 || rawLogin.toLowerCase() === "anonymous";

        const displayName =
          s.name && s.name.trim().length > 0
            ? s.name.trim()
            : isAnonymous
              ? "Anonymous Supporter"
              : rawLogin;

        return {
          login: isAnonymous ? "" : rawLogin,
          name: displayName,
          is_anonymous: isAnonymous,
          avatar_url: isAnonymous ? "" : `https://github.com/${rawLogin}.png`,
          profile_url: isAnonymous
            ? `https://github.com/sponsors/${maintainerUsername}`
            : `https://github.com/${rawLogin}`,
          created_at: s.created_at || new Date().toISOString(),
          active: s.active ?? true,
          // CRITICAL: Individual monthly/total amounts are strictly omitted!
        };
      }
    );

    // 2 developer sponsors
    const devSponsors: PublicSponsor[] = [
      {
        login: "Not-Dhananjay-Mishra",
        name: "Dhananjay Mishra",
        is_anonymous: false,
        avatar_url: "https://github.com/Not-Dhananjay-Mishra.png",
        profile_url: "https://github.com/Not-Dhananjay-Mishra",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        active: true,
      },
      {
        login: "ManavSharma142",
        name: "Manav Sharma",
        is_anonymous: false,
        avatar_url: "https://github.com/ManavSharma142.png",
        profile_url: "https://github.com/ManavSharma142",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        active: true,
      },
    ];

    const existingLogins = new Set(publicSponsors.map((s) => s.login.toLowerCase()));
    const additionalDevs = devSponsors.filter(
      (d) => !existingLogins.has(d.login.toLowerCase())
    );
    const allSponsors: PublicSponsor[] = [...publicSponsors, ...additionalDevs];
    const sponsorCount = Math.max(allSponsors.length, apiSponsorCount);

    const response: FundingResponse = {
      success: true,
      username: maintainerUsername,
      monthlySpendGoal,
      monthlyAmount,
      totalAmount,
      currency,
      currentMonth,
      sponsorCount,
      runwayMonths,
      remainingMonthly,
      monthlyFundedPercent,
      isMonthlyGoalMet,
      customNotice,
      sponsors: allSponsors,
      sponsorUrl: `https://github.com/sponsors/${maintainerUsername}`,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error in public funding endpoint:", error);
    const fallback: FundingResponse = {
      success: false,
      username: DEFAULT_MAINTAINER,
      monthlySpendGoal: DEFAULT_MONTHLY_GOAL,
      monthlyAmount: 0,
      totalAmount: 0,
      currency: "USD",
      currentMonth: new Date().toISOString().slice(0, 7),
      sponsorCount: 2,
      runwayMonths: 0,
      remainingMonthly: DEFAULT_MONTHLY_GOAL,
      monthlyFundedPercent: 0,
      isMonthlyGoalMet: false,
      sponsors: [
        {
          login: "Not-Dhananjay-Mishra",
          name: "Dhananjay Mishra",
          is_anonymous: false,
          avatar_url: "https://github.com/Not-Dhananjay-Mishra.png",
          profile_url: "https://github.com/Not-Dhananjay-Mishra",
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          active: true,
        },
        {
          login: "ManavSharma142",
          name: "Manav Sharma",
          is_anonymous: false,
          avatar_url: "https://github.com/ManavSharma142.png",
          profile_url: "https://github.com/ManavSharma142",
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          active: true,
        },
      ],
      sponsorUrl: `https://github.com/sponsors/${DEFAULT_MAINTAINER}`,
    };
    return NextResponse.json(fallback, { status: 200 });
  }
}
