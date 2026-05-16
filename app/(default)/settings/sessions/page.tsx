import { getActiveSessions } from "@/data/session";
import SessionsTable from "@/components/layout/sessions-table";

export default async function SessionsPage() {
  const sessions = await getActiveSessions();

  return (
    <>
      <h2>Aktive sessioner</h2>
      <SessionsTable sessions={sessions} />
    </>
  );
}
