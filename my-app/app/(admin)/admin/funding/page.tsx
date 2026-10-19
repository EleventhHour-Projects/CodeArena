"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Coins,
  Save,
  RefreshCw,
  TrendingUp,
  Server,
  Heart,
  Sliders,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminFundingConfig {
  monthlySpendGoal: number;
  manualTotalAmount: number;
  manualMonthlyAmount: number;
  overrideApiAmounts: boolean;
  maintainerUsername: string;
  customNotice: string;
  updatedAt?: string;
}

export default function AdminFundingPage() {
  const [config, setConfig] = useState<AdminFundingConfig>({
    monthlySpendGoal: 5,
    manualTotalAmount: 0,
    manualMonthlyAmount: 0,
    overrideApiAmounts: false,
    maintainerUsername: "Not-Dhananjay-Mishra",
    customNotice: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/funding");
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      } else {
        toast.error("Failed to fetch funding settings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error fetching funding settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/funding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        toast.success("Funding settings saved & recalculated!");
      } else {
        toast.error(data.error || "Failed to update funding settings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  // Live calculations for preview
  const goal = config.monthlySpendGoal > 0 ? config.monthlySpendGoal : 5;
  const total = config.manualTotalAmount;
  const monthly = config.manualMonthlyAmount;
  const runwayMonths = (total / goal).toFixed(1);
  const percentFunded = Math.min(100, Math.round((monthly / goal) * 100));

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
              Funding &amp; Runway Controls
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure server burn rate, record offline/manual collections (e.g. $100 reserve), and adjust runway calculations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConfig}
            disabled={loading || saving}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Controls */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          {/* Section 1: Financial Parameters */}
          <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Budget &amp; Spend Targets
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Monthly Spend Goal */}
              <div className="space-y-2">
                <Label htmlFor="monthlySpendGoal" className="text-xs font-semibold">
                  Monthly Infrastructure Expense ($)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">$</span>
                  <Input
                    id="monthlySpendGoal"
                    type="number"
                    step="0.5"
                    min="1"
                    value={config.monthlySpendGoal}
                    onChange={(e) =>
                      setConfig({ ...config, monthlySpendGoal: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-8 font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Default: $5.00/month. The fixed cost required to keep the VM alive.
                </p>
              </div>

              {/* Total Manual / Reserve Amount */}
              <div className="space-y-2">
                <Label htmlFor="manualTotalAmount" className="text-xs font-semibold">
                  Total Collection / Reserve Funds ($)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">$</span>
                  <Input
                    id="manualTotalAmount"
                    type="number"
                    step="1"
                    min="0"
                    value={config.manualTotalAmount}
                    onChange={(e) =>
                      setConfig({ ...config, manualTotalAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-8 font-mono font-bold text-emerald-400"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  For example: $100 provides 20 months of survival at $5/month.
                </p>
              </div>

              {/* This Month's Recurring Amount */}
              <div className="space-y-2">
                <Label htmlFor="manualMonthlyAmount" className="text-xs font-semibold">
                  Current Month Recurring Funding ($)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">$</span>
                  <Input
                    id="manualMonthlyAmount"
                    type="number"
                    step="0.5"
                    min="0"
                    value={config.manualMonthlyAmount}
                    onChange={(e) =>
                      setConfig({ ...config, manualMonthlyAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="pl-8 font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Current month sponsorship collected towards the $5 goal.
                </p>
              </div>

              {/* GitHub Maintainer Username */}
              <div className="space-y-2">
                <Label htmlFor="maintainerUsername" className="text-xs font-semibold">
                  GitHub Maintainer Username
                </Label>
                <Input
                  id="maintainerUsername"
                  type="text"
                  value={config.maintainerUsername}
                  onChange={(e) =>
                    setConfig({ ...config, maintainerUsername: e.target.value })
                  }
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  GitHub account queried for sponsors (Not-Dhananjay-Mishra).
                </p>
              </div>
            </div>

            {/* Quick-Preset Buttons for Testing & Common Amounts */}
            <div className="pt-3 border-t border-border/40">
              <span className="text-xs font-semibold text-muted-foreground block mb-2">
                Quick Preset Scenarios:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfig({
                      ...config,
                      monthlySpendGoal: 5,
                      manualTotalAmount: 100,
                      manualMonthlyAmount: 5,
                      overrideApiAmounts: true,
                    })
                  }
                  className="text-xs h-7"
                >
                  $100 Total (20 Months Runway)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfig({
                      ...config,
                      monthlySpendGoal: 5,
                      manualTotalAmount: 60,
                      manualMonthlyAmount: 5,
                      overrideApiAmounts: true,
                    })
                  }
                  className="text-xs h-7"
                >
                  $60 Total (1 Year Runway)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfig({
                      ...config,
                      monthlySpendGoal: 5,
                      manualTotalAmount: 0,
                      manualMonthlyAmount: 0,
                      overrideApiAmounts: false,
                    })
                  }
                  className="text-xs h-7"
                >
                  Reset to Live API
                </Button>
              </div>
            </div>

            {/* Override vs Add Toggle */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <div>
                <Label htmlFor="overrideApiAmounts" className="text-sm font-semibold cursor-pointer">
                  Use Manual Amounts as Override
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, uses the numbers above directly. When disabled, adds them to live GitHub API stats.
                </p>
              </div>
              <input
                id="overrideApiAmounts"
                type="checkbox"
                checked={config.overrideApiAmounts}
                onChange={(e) =>
                  setConfig({ ...config, overrideApiAmounts: e.target.checked })
                }
                className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
              />
            </div>
          </div>

          {/* Section 2: Custom Notice Message */}
          <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Custom Notice (Optional)
            </h2>
            <p className="text-xs text-muted-foreground">
              Optional message displayed inside the funding modal to give donors context.
            </p>
            <Input
              value={config.customNotice}
              onChange={(e) => setConfig({ ...config, customNotice: e.target.value })}
              placeholder="e.g. We are raising $5/month to cover our dedicated GCP VM..."
              className="text-sm"
            />
          </div>
        </form>

        {/* Right Col: Live Preview */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Calculation Preview
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {config.overrideApiAmounts ? "Manual Override" : "API + Manual"}
              </span>
            </div>

            {/* Metric: Survival Runway */}
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Calculated Runway</span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 tracking-tight">
                {runwayMonths} Months
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Based on ${total.toFixed(2)} total collection at ${goal.toFixed(2)}/mo burn rate.
              </p>
            </div>

            {/* Metric: Total & Monthly Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total Collection:</span>
                <span className="font-bold text-white font-mono">${total.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Monthly Burn Target:</span>
                <span className="font-bold text-white font-mono">${goal.toFixed(2)} / mo</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">This Month:</span>
                <span className="font-bold text-emerald-400 font-mono">${monthly.toFixed(2)}</span>
              </div>

              {/* Mini progress bar */}
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${percentFunded}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500 text-right">
                {percentFunded}% of monthly expense covered
              </div>
            </div>

            <Button
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs py-2 h-auto cursor-pointer"
            >
              Apply &amp; Recalculate Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
