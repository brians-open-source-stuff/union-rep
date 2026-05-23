import Anniversaries from "@/components/layout/dashboard/anniversaries";
import Birthdays from "@/components/layout/dashboard/birthdays";
import ContactRisk from "@/components/layout/dashboard/contact-risk";
import MemberChart from "@/components/layout/dashboard/charts/memberchart";
import MembershipTimelineChart from "@/components/layout/dashboard/charts/timelinechart";
import {
  getEmployeeCounts,
  getEmployeeMembershipTimeline,
  getEmployeesAtContactRisk,
  getMemberBirthdaysNext7Days,
  getMemberEmploymentAnniversaries,
} from "@/data/employee-dto";

export default async function Home() {

  const { totalEmployees, members } = await getEmployeeCounts();
  const timeline = await getEmployeeMembershipTimeline();
  const memberBirthdaysNext7Days = await getMemberBirthdaysNext7Days();
  const upcommingAnniversaties = await getMemberEmploymentAnniversaries();
  const contactRiskEmployees = await getEmployeesAtContactRisk();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <MemberChart totalEmployees={totalEmployees} members={members} />
      <MembershipTimelineChart data={timeline} />
      <Birthdays data={memberBirthdaysNext7Days} />
      <Anniversaries data={upcommingAnniversaties} />
      <ContactRisk data={contactRiskEmployees} />
    </div>
  );
}
