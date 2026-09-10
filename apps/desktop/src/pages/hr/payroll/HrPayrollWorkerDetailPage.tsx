import { useParams } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { PageHeader, EmptyState } from "@/shared";

export default function HrPayrollWorkerDetailPage() {
  const { id } = useParams();
  return (
    <AppShell navigation={buildAppNavigation()} activeLabel="hr-payroll-workers" user={{name:"HR",role:"HR"}} mobileNav={buildAppMobileNav("HR")}>
      <PageHeader title="Worker Payroll Detail" breadcrumbs={[{label:"HR",path:"/hr/payroll/workers"}]} />
      <EmptyState title="Worker Detail" description={`Detail for worker ${id} (to be implemented per plan)`} />
    </AppShell>
  );
}
