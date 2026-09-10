import { Button, Icon, useToast } from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { hrApi, useCachedQuery } from "@/shared/lib/core";
import { useState } from "react";

interface DesignationsTabProps {
  onEditDesignation: (designation: any) => void;
}

export default function DesignationsTab({ onEditDesignation }: DesignationsTabProps) {
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, refetch } = useCachedQuery(
    `hr:designations:list:${refreshKey}`,
    () => hrApi.listDesignations(),
    { ttlMs: 1000 * 30, storage: "memory" }
  );

  const list = Array.isArray(data) ? data : [];

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this job title? Any employees referencing it will default to no template.")) {
      return;
    }
    try {
      await hrApi.deleteDesignation(id);
      showToast({ tone: "success", title: "Deleted", message: "Job title designation deleted successfully." });
      setRefreshKey(k => k + 1);
      void refetch();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to delete" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Job Title Designation Templates</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage master job titles and their default job description documents.</p>
        </div>
        <Button onClick={() => onEditDesignation(true)} className="gap-1">
          <Icon name="add" />
          Add Job Title
        </Button>
      </div>

      {loading && list.length === 0 ? (
        <div className="text-sm text-slate-500 py-4">Loading job titles...</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-slate-500 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          No job title designations defined yet. Click "Add Job Title" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <DataTable
            columns={[
              { header: "Name", className: "font-semibold text-slate-900", cell: (item: any) => item.name },
              { header: "Code", cell: (item: any) => item.code || "-" },
              { header: "Description", cell: (item: any) => item.description || "-" },
              { header: "Job Description Template", cell: (item: any) => item.job_description ? (
                <span className="text-success text-xs font-semibold flex items-center gap-1">
                  <Icon name="check_circle" className="text-sm" /> Configured
                </span>
              ) : (
                <span className="text-slate-400 text-xs">-</span>
              ) },
              { header: "Actions", className: "text-right space-x-2", cell: (item: any) => (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEditDesignation(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-danger hover:bg-danger/5"
                    onClick={() => void handleDelete(item.id)}
                  >
                    <Icon name="delete" className="text-sm" />
                  </Button>
                </>
              ) },
            ]}
            data={list}
          />
        </div>
      )}
    </div>
  );
}
