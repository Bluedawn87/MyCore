"use client";

// Wrapper components to fix React 19 defaultProps warnings in recharts
import { LineChart as RechartsLineChart, Line as RechartsLine } from 'recharts';

export const LineChart = (props: any) => {
  return <RechartsLineChart {...props} />;
};

export const Line = (props: any) => {
  return <RechartsLine {...props} />;
};

// Re-export other components unchanged
export { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';