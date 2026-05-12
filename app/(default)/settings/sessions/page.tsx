import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getActiveSessions } from "@/data/session";

export default async function SessionsPage() {
  const sessions = await getActiveSessions();

  return (
    <>
      <h2>Aktive sessioner</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Oprettet</TableHead>
            <TableHead>Bruger</TableHead>
            <TableHead>Tilladelser</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                {Intl.DateTimeFormat("da-DK", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(session.createdAt))}
              </TableCell>
              <TableCell>{session.userName}</TableCell>
              <TableCell>
                <details>
                  <summary className="cursor-pointer select-none">
                    Vis tilladelser ({session.permissions.length})
                  </summary>
                  <ul className="mt-2 text-sm text-muted-foreground">
                    {session.permissions.map(perm => <li key={perm}>{perm}</li>)}
                  </ul>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
