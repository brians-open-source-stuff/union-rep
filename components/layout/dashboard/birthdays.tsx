import { BirthdayThisWeek } from "@/data/employee-dto";

export default function Birthdays({ data }: { data: BirthdayThisWeek[] }) {
	return (
		<div className="bg-gray-50 p-4 rounded-2xl">
			<h2 className="mb-3 text-base font-semibold">Birthdays This Week</h2>
			<ul>
				{data && data.map(e => (
					<li key={e.name}>
						<strong>{e.name}</strong>
						<ul>
							<li>Celebrates {e.age} years</li>
							<li>on {Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long" }).format(new Date(e.birthdate))}</li>
						</ul>
					</li>))}
			</ul>
		</div>
	);
}