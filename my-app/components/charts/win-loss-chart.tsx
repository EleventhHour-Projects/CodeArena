"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface OutcomeData {
  wins: number;
  losses: number;
  draws: number;
}

export function WinLossDonut({ data }: { data: OutcomeData }) {
  const total = data.wins + data.losses + data.draws;

  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium text-sm">
        No battles completed yet.
      </div>
    );
  }

  const chartData = [
    { name: "Wins", value: data.wins, color: "#22c55e" }, // green-500
    { name: "Losses", value: data.losses, color: "#ef4444" }, // red-500
    { name: "Draws", value: data.draws, color: "#71717a" }, // zinc-500
  ].filter(d => d.value > 0);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", color: "#f4f4f5" }}
            itemStyle={{ fontWeight: "bold", color: "#f4f4f5" }}
            formatter={(value: any) => [value, "Battles"]}
          />
          <Legend 
             verticalAlign="bottom" 
             height={36}
             iconType="circle"
             formatter={(value, entry: any) => (
               <span style={{ color: entry.color, fontWeight: "bold", marginLeft: "4px" }}>{value}</span>
             )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Label Overlay */}
      <div className="absolute pointer-events-none flex flex-col items-center justify-center -translate-y-[18px]">
        <span className="text-3xl font-black text-white">{total}</span>
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-zinc-500">Total</span>
      </div>
    </div>
  );
}
