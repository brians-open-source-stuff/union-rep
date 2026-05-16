import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROW_COUNT = 8;

export default function EmployeesLoading() {
	return (
		<div className="space-y-4">
			<div className="mb-4 flex items-center justify-between gap-3">
				<h2>Medarbejdere</h2>
				<Skeleton className="h-10 w-32" />
			</div>

			<div className="flex flex-wrap gap-3">
				<Skeleton className="h-10 w-44" />
				<Skeleton className="h-10 w-44" />
				<Skeleton className="h-10 w-44" />
				<Skeleton className="h-10 w-52" />
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead></TableHead>
						<TableHead>Navn</TableHead>
						<TableHead>Afdeling</TableHead>
						<TableHead>Titel</TableHead>
						<TableHead>Chef/leder</TableHead>
						<TableHead>Ansat dato</TableHead>
						<TableHead>Indmeldelsesdato</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: ROW_COUNT }).map((_, index) => (
						<TableRow key={index}>
							<TableCell>
								<div className="flex items-center gap-1">
									<Skeleton className="h-8 w-8" />
									<Skeleton className="h-8 w-8" />
								</div>
							</TableCell>
							<TableCell><Skeleton className="h-4 w-36" /></TableCell>
							<TableCell><Skeleton className="h-4 w-28" /></TableCell>
							<TableCell><Skeleton className="h-4 w-24" /></TableCell>
							<TableCell><Skeleton className="h-4 w-32" /></TableCell>
							<TableCell><Skeleton className="h-4 w-24" /></TableCell>
							<TableCell><Skeleton className="h-4 w-24" /></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
