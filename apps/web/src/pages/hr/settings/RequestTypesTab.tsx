import { useState, useEffect } from "react";
import {
  Button,
  Chip,
  Icon,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { cacheStore, requestApi } from "@/shared/lib/core";
import { type RequestType } from "@stanforte/shared";
import RequestTypeSlideOver from "@/pages/admin/request-types/RequestTypeSlideOver";

export default function RequestTypesTab() {
  const { showToast } = useToast();
  const [types, setTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<RequestType | null | boolean>(false);

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

  const handleDelete = async (type: RequestType) => {
    if (!window.confirm(`Delete request type "${type.name}"? This cannot be undone.`)) return;
    try {
      await requestApi.deleteType(type.id);
      cacheStore.invalidateCache("requests:types");
      cacheStore.invalidateCache("hr:leave_types");
      showToast({ tone: "success", title: "Deleted", message: `${type.name} has been removed.` });
      void load();
    } catch (err) {
      showToast({ tone: "danger", title: "Delete failed", message: err instanceof Error ? err.message : "Unable to delete request type." });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">HR Request Types</h3>
          <p className="text-sm text-slate-500 mt-1">Manage HR-specific request categories (Leave, etc.)</p>
        </div>
        <Button onClick={() => setEditingType(true)}>
          <Icon name="add" className="mr-1" />
          Add Type
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
          { header: "Actions", className: "text-right", cell: (t: RequestType) => (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingType(t)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/5" onClick={() => void handleDelete(t)}>Delete</Button>
            </div>
          ) },
        ]}
        data={types}
        loading={loading}
      />
      
      <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
        Configure the approval flow and visibility rules when creating or editing a type.
      </p>

      {editingType !== false && (
        <RequestTypeSlideOver
          requestType={typeof editingType === "object" ? editingType : null}
          onClose={() => setEditingType(false)}
          onSaved={() => {
            setEditingType(false);
            void load();
          }}
        />
      )}
    </div>
  );
}
