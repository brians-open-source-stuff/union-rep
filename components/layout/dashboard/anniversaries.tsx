import { UpcomingAnniversary } from "@/data/employee-dto";

export default function Anniversaries({ data }: { data: UpcomingAnniversary[] }) {
	console.log("anniversaries", data)
	return (
		<div className="bg-gray-50 p-4 rounded-2xl">
			<h2 className="mb-3 text-base font-semibold">Upcomming Anniversaries</h2>
		</div>
	);
}