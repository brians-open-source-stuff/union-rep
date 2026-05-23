"use client";

import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";

type TimelinePoint = {
	month: string;
	employees: number;
	members: number;
	membershipRate: number;
};

const chartConfig = {
	employees: { label: "Medarbejdere", color: "#93c5fd" }, // lyseblaa
	members: { label: "Medlemmer", color: "#ef4444" }, // roed
};

export default function MembershipTimelineChart({ data }: { data: TimelinePoint[] }) {
	return (
		<div className="bg-gray-50 p-4 rounded-2xl">
			<h2 className="mb-3 text-base font-semibold">Medlemsudvikling</h2>

			<ChartContainer config={chartConfig} className="h-80 w-full">
				<LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="month"
						tickLine={false}
						axisLine={false}
						minTickGap={24}
						tickFormatter={(value: string) => {
							const [year, month] = value.split("-");
							return `${month}/${year.slice(2)}`;
						}}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						width={44}
						allowDecimals={false}
					/>
					<ChartTooltip
						content={
							<ChartTooltipContent
								labelFormatter={(label) => "Måned: " + String(label)}
							/>
						}
					/>
					<ChartLegend content={<ChartLegendContent />} />
					<Line
						type="monotone"
						dataKey="employees"
						stroke="var(--color-employees)"
						strokeWidth={2.5}
						dot={false}
					/>
					<Line
						type="monotone"
						dataKey="members"
						stroke="var(--color-members)"
						strokeWidth={2.5}
						dot={false}
					/>
				</LineChart>
			</ChartContainer>
		</div>
	);
}