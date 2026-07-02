import { useStore } from "../lib/store";
import { Overview } from "./pages/Overview";
import { Voting } from "./pages/Voting";
import { DualSign } from "./pages/DualSign";
import { ExpenseApproval } from "./pages/ExpenseApproval";
import { PropertyMgmt } from "./pages/PropertyMgmt";
import { FundReview } from "./pages/FundReview";
import { Election } from "./pages/Election";
import { Finance } from "./pages/Finance";
import { Owners } from "./pages/Owners";
import { Topology } from "./pages/Topology";
import { Rbac } from "./pages/Rbac";
import { BuildingAssignment } from "./pages/BuildingAssignment";
import { WorkIdentity } from "./pages/WorkIdentity";
import { Certification } from "./pages/Certification";
import { CommitteeRoster } from "./pages/CommitteeRoster";
import { TermManagement } from "./pages/TermManagement";
import { MeetingMinutes } from "./pages/MeetingMinutes";
import { Duties } from "./pages/Duties";
import { Assets } from "./pages/Assets";
import { WorkOrders } from "./pages/WorkOrders";
import { Engineering } from "./pages/Engineering";
import { Announcements } from "./pages/Announcements";
import { PushRecords } from "./pages/PushRecords";
import { Reports } from "./pages/Reports";

const PAGES: Record<string, () => JSX.Element> = {
  overview: Overview,
  voting: Voting,
  "dual-sign": DualSign,
  "expense-approval": ExpenseApproval,
  "property-mgmt": PropertyMgmt,
  "fund-review": FundReview,
  election: Election,
  finance: Finance,
  owners: Owners,
  topology: Topology,
  rbac: Rbac,
  "building-assignment": BuildingAssignment,
  "work-identity": WorkIdentity,
  certification: Certification,
  "committee-roster": CommitteeRoster,
  "term-management": TermManagement,
  "meeting-minutes": MeetingMinutes,
  duties: Duties,
  assets: Assets,
  "work-orders": WorkOrders,
  engineering: Engineering,
  announcements: Announcements,
  "push-records": PushRecords,
  reports: Reports,
};

export function Router() {
  const { page } = useStore();
  const Page = PAGES[page] ?? Overview;
  return <Page />;
}
