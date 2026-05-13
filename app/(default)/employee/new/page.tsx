import { redirect } from "next/navigation";

export default async function LegacyNewEmployeePage() {
  redirect("/employees/new");
}