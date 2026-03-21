"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

interface RatingPoint {
  date: string;
  rating: number;
}

export function RatingChart({ data }: { data: RatingPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium text-sm">
        No rated battles completed yet.
      </div>
    );
  }

  const formattedData = data.map(d => ({
    ...d,
    timeLabel: format(new Date(d.date), "MMM d") // e.g. "Mar 15"
  }));

  // Find min and max for the Y axis domain to make the graph dynamic instead of squashed
  const minRating = Math.min(...data.map(d => d.rating));
  const maxRating = Math.max(...data.map(d => d.rating));
  const yDomain = [Math.max(0, minRating - 50), maxRating + 50];

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="timeLabel" 
            stroke="#52525b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            minTickGap={30}
          />
          <YAxis 
            domain={yDomain} 
            stroke="#52525b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px", color: "#f4f4f5" }}
            itemStyle={{ color: "#4ade80", fontWeight: "bold" }}
            formatter={(value: any) => [`${value} Rating`, "Rating"]}
            labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="#22c55e"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRating)"
            activeDot={{ r: 6, fill: "#22c55e", stroke: "#050505", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
