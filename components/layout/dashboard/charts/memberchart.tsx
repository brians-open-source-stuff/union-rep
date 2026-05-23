"use client";
import { Cell, Legend, Pie, PieChart } from "recharts";

export default function MemberChart({ totalEmployees, members }: { totalEmployees: number; members: number }) {
	const data = [
		{ name: "Ikke-medlemmer", value: totalEmployees - members },
		{ name: "Medlemmer", value: members },
	];

	const colors = ["#93c5fd", "#ef4444"];
	const total = data.reduce((sum, item) => sum + item.value, 0);

	const toPercent = (value: number) => {
		if (total === 0) return 0;
		return Math.round((value / total) * 100);
	};

	return (
		<div className="bg-gray-50 p-4 rounded-2xl">
			<h2 className="mb-3 text-base font-semibold">Medlemsgrad</h2>
			<PieChart style={{ width: "100%", height: "100%", aspectRatio: "1/0.5" }} responsive>
				<Pie
					data={data}
					dataKey="value"
					cx="50%"
					cy="50%"
					labelLine={false}
					label={({ name, value }) => `${name}: ${toPercent(value as number)}%`}
				>
					{data.map((entry, index) => (
						<Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
					))}
				</Pie>
				<Legend
					align="center"
					verticalAlign="bottom"
					iconType="circle"
					wrapperStyle={{ paddingTop: 12 }}
					formatter={(value) => {
						const name = String(value);
						const item = data.find((entry) => entry.name === name);
						if (!item) return name;
						return `${name}: ${toPercent(item.value)}%`;
					}}
				/>
			</PieChart>
		</div>
	);
}