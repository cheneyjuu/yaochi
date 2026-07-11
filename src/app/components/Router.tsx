import { useStore } from "../lib/store";
import { Overview } from "./pages/Overview";
import { Voting } from "./pages/Voting";
import { DualSign } from "./pages/DualSign";
import { ExpenseApproval } from "./pages/ExpenseApproval";
import { PropertyMgmt } from "./pages/PropertyMgmt";
import { FundReview } from "./pages/FundReview";
import { Election } from "./pages/Election";
import { SubjectProposal } from "./pages/SubjectProposal";
import { Disputes } from "./pages/Disputes";
import { Finance } from "./pages/Finance";
import { Owners } from "./pages/Owners";
import { Topology } from "./pages/Topology";
import { Rbac } from "./pages/Rbac";
import { WorkIdentity } from "./pages/WorkIdentity";
import { GridManagement } from "./pages/GridManagement";
import { CommunitySettings } from "./pages/CommunitySettings";
import { Certification } from "./pages/Certification";
import { CommitteeRoster } from "./pages/CommitteeRoster";
import { TermManagement } from "./pages/TermManagement";
import { MeetingMinutes } from "./pages/MeetingMinutes";
import { Duties } from "./pages/Duties";
import { Assets } from "./pages/Assets";
import { WorkOrders } from "./pages/WorkOrders";
import { WorkOrderEditor } from "./pages/WorkOrderEditor";
import { OwnersAssembly } from "./pages/OwnersAssembly";
import { Engineering } from "./pages/Engineering";
import { Announcements } from "./pages/Announcements";
import { AnnouncementEditor } from "./pages/AnnouncementEditor";
import { PushRecords } from "./pages/PushRecords";
import { Reports } from "./pages/Reports";
import { SubjectProposalEditor } from "./pages/SubjectProposalEditor";
import { PropertyRosterImport } from "./pages/PropertyRosterImport";
import { PropertyBindingReview } from "./pages/PropertyBindingReview";
import { SupplierWorkbench } from "./pages/SupplierWorkbench";

const PAGES: Record<string, () => JSX.Element> = {
  overview: Overview,
  voting: Voting,
  "dual-sign": DualSign,
  "expense-approval": ExpenseApproval,
  "property-mgmt": PropertyMgmt,
  "fund-review": FundReview,
  election: Election,
  "subject-proposal": SubjectProposal,
  disputes: Disputes,
  "subject-proposal-editor": SubjectProposalEditor,
  finance: Finance,
  owners: Owners,
  topology: Topology,
  rbac: Rbac,
  "work-identity": WorkIdentity,
  "grid-management": GridManagement,
  "community-settings": CommunitySettings,
  certification: Certification,
  "committee-roster": CommitteeRoster,
  "term-management": TermManagement,
  "meeting-minutes": MeetingMinutes,
  duties: Duties,
  assets: Assets,
  "work-orders": WorkOrders,
  "work-order-editor": WorkOrderEditor,
  "owners-assembly": OwnersAssembly,
  engineering: Engineering,
  announcements: Announcements,
  "announcement-editor": AnnouncementEditor,
  "push-records": PushRecords,
  reports: Reports,
  "property-roster-import": PropertyRosterImport,
  "property-binding-review": PropertyBindingReview,
  "supplier-workbench": SupplierWorkbench,
};

export function Router() {
  const { page } = useStore();
  const Page = PAGES[page] ?? Overview;
  return <Page />;
}
