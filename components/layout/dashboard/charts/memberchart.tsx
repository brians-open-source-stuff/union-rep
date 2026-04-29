"use client";
import { Pie, PieChart, Sector } from "recharts";

export default function MemberChart({ totalEmployees, members }: { totalEmployees: number; members: number }) {
	const data = [
		{ name: "Non-members", value: totalEmployees - members },
		{ name: "Members", value: members },
	];

	const colors = ["#93c5fd", "#ef4444"];

	return (
		<div className="bg-gray-50 p-4 rounded-2xl">
			<h2>Membership Percentage</h2>
			<PieChart style={{ width: "100%", height: "100%", aspectRatio: "1/0.5" }} responsive>
				<Pie
					data={data}
					dataKey="value"
					cx="50%"
					cy="50%"
					shape={(props, index) => <Sector {...props} fill={colors[index]} />}
				/>
			</PieChart>
		</div>
	);
}