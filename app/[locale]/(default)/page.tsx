import Anniversaries from "@/components/layout/dashboard/anniversaries";
import Birthdays from "@/components/layout/dashboard/birthdays";
import MemberChart from "@/components/layout/dashboard/charts/memberchart";
import MembershipTimelineChart from "@/components/layout/dashboard/charts/timelinechart";
import { getDictionary, hasLocale } from "@/data/dictionaries";
import { getEmployeeCounts, getEmployeeMembershipTimeline, getMemberBirthdaysThisWeek, getMemberEmploymentAnniversaries } from "@/data/employee-dto";
import { notFound } from "next/navigation";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const { totalEmployees, members } = await getEmployeeCounts();
  const timeline = await getEmployeeMembershipTimeline();
  const memberBirthdaysThisWeek = await getMemberBirthdaysThisWeek();
  const upcommingAnniversaties = await getMemberEmploymentAnniversaries();

  return (
    <div className="grid grid-cols-3 gap-4">
      <MemberChart totalEmployees={totalEmployees} members={members} />
      <MembershipTimelineChart data={timeline} />
      <Birthdays data={memberBirthdaysThisWeek} />
      <Anniversaries data={upcommingAnniversaties} />
    </div>
  );
}
