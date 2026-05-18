import { UpcomingAnniversary } from "@/data/employee-dto";

export default function Anniversaries({ data }: { data: UpcomingAnniversary[] }) {
	return (
		<div className="bg-gray-50 p-4 rounded-2xl">
			<h2 className="mb-3 text-base font-semibold">Kommende jubilæer</h2>
			<ul>
				{data.map(employee => (
					<li key={employee.name}>
						<p>{employee.name} fejrer {employee.years}</p>
						<p>{Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(employee.employedAt)}</p>
					</li>
				))}
			</ul>
		</div>
	);
}