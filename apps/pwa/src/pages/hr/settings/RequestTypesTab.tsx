import { useState, useEffect } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  SectionCard,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { requestApi } from "@/shared/lib/core";
import { type RequestType } from "@stanforte/shared";

export default function RequestTypesTab() {
  const { showToast } = useToast();
  const [types, setTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await requestApi.listTypes();
      // Filter for HR related types (Leave, etc.)
      const hrTypes = res.filter((t: RequestType) =>
        t.category?.toLowerCase().includes('leave') || 
        t.category?.toLowerCase().includes('hr') ||
        t.name.toLowerCase().includes('leave')
      );
      setTypes(hrTypes);
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load request types." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">HR Request Types</h3>
          <p className="text-sm text-slate-500 mt-1">Manage HR-specific request categories (Leave, etc.)</p>
        </div>
        <Button disabled>
          <Icon name="add" className="mr-1" />
          Add Type (Coming Soon)
        </Button>
      </div>

      <DataTable
        columns={[
          { header: "Name", className: "font-bold text-slate-900", cell: (t: any) => t.name },
          { header: "Slug", className: "font-mono text-xs", cell: (t: any) => t.slug },
          { header: "Category", className: "capitalize", cell: (t: any) => t.category || "General" },
          { header: "Status", cell: (t: any) => (
            <Chip variant={t.is_active ? "success" : "neutral"}>
              {t.is_active ? "Active" : "Disabled"}
            </Chip>
          ) },
          { header: "Action", className: "text-right", cell: (t: any) => (
            <Button variant="ghost" size="sm" disabled>
              Edit
            </Button>
          ) },
        ]}
        data={types}
        loading={loading}
      />
      
      <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
        Note: Complex request workflow editing (form building) will be available in the next phase of the migration.
      </p>
    </div>
  );
}
