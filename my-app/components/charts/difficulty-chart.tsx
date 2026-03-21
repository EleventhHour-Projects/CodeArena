"use client";

import React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface DifficultyData {
  easy: number;
  medium: number;
  hard: number;
}

export function DifficultyChart({ data }: { data: DifficultyData }) {
  const chartData = [
    { name: "Easy", solved: data.easy, color: "#22c55e" }, // green-500
    { name: "Medium", solved: data.medium, color: "#eab308" }, // yellow-500
    { name: "Hard", solved: data.hard, color: "#ef4444" }, // red-500
  ];

  const hasData = chartData.some(d => d.solved > 0);

  if (!hasData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium text-sm">
        No problems solved yet.
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            stroke="#a1a1aa" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#52525b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{ fill: "#27272a", opacity: 0.4 }}
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", color: "#f4f4f5" }}
            itemStyle={{ fontWeight: "bold", color: "#f4f4f5" }}
            formatter={(value: any) => [value, "Solved"]}
          />
          <Bar dataKey="solved" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
