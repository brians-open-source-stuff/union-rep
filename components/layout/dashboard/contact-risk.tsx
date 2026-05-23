import Link from "next/link";
import { ContactRiskEmployee } from "@/data/employee-dto";

function getRiskLabel(riskLevel: ContactRiskEmployee["riskLevel"]) {
	if (riskLevel === "high") return "Meget længe siden";
	if (riskLevel === "medium") return "Længe siden";
	return "For nylig";
}

function getRiskClass(riskLevel: ContactRiskEmployee["riskLevel"]) {
	if (riskLevel === "high") return "bg-red-100 text-red-800";
	if (riskLevel === "medium") return "bg-amber-100 text-amber-800";
	return "bg-blue-100 text-blue-800";
}

export default function ContactRisk({ data }: { data: ContactRiskEmployee[] }) {
	return (
		<div className="bg-gray-50 p-4 rounded-2xl xl:col-span-2">
			<h2 className="mb-3 text-base font-semibold">Kontakt</h2>
			{data.length === 0 ? (
				<p className="text-sm text-gray-600">🎉 Du taler ofte med alle dine medlemmer!</p>
			) : (
				<ul className="space-y-3">
					{data.map((employee) => (
						<li key={employee.id} className="rounded-xl border bg-white p-3">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-semibold">
										<Link className="hover:underline" href={`/employees/${employee.id}`}>
											{employee.name}
										</Link>
									</p>
									<p className="text-sm text-gray-600">{employee.reason}</p>
									<p className="text-xs text-gray-500">
										Kontaktperson: {employee.primaryContactName ?? "Ikke tildelt"}
									</p>
								</div>
								<span className={`rounded-full px-2 py-1 text-xs font-medium ${getRiskClass(employee.riskLevel)}`}>
									{getRiskLabel(employee.riskLevel)}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
