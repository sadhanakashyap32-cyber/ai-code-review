"use client";

import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function UsageTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-foreground/40 text-sm">No trend data available</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
            itemStyle={{ color: '#3b82f6' }}
            cursor={{ stroke: '#ffffff20' }}
          />
          <Line 
            type="monotone" 
            dataKey="usage" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={{ fill: '#3b82f6', strokeWidth: 2, stroke: '#000' }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LanguagesChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-foreground/40 text-sm">No language data available</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
            cursor={{ fill: '#ffffff10' }}
          />
          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
