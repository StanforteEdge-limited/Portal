import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  useToast,
  Chip,
  EmptyState,
  Icon,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { attendanceApi } from "@/shared/lib/core";
import { type OfficeLocation } from "@stanforte/shared";

type Props = {
  onEditLocation: (location: OfficeLocation | null | boolean) => void;
};

export default function OfficeLocationsTab({ onEditLocation }: Props) {
  const { showToast } = useToast();
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await attendanceApi.listOfficeLocations();
      setLocations(res.data);
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load office locations." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 text-sm">Loading office locations...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Attendance Geofences</h3>
          <p className="text-sm text-slate-500 mt-1">Authorized locations where staff can clock in and out.</p>
        </div>
        <Button onClick={() => onEditLocation(true)}>
          <Icon name="add" className="mr-1" />
          Add Location
        </Button>
      </div>

      <DataTable
        columns={[
          { header: "Name", cell: (loc: any) => (
            <>
              <p className="font-bold text-slate-900">{loc.name}</p>
              <p className="text-xs text-slate-500">{loc.address || "No address provided"}</p>
            </>
          ) },
          { header: "Coordinates", className: "font-mono text-[11px] text-slate-600", cell: (loc: any) => `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` },
          { header: "Radius", cell: (loc: any) => `${loc.radius_meters}m` },
          { header: "Organizations", cell: (loc: any) => (
            <div className="flex flex-wrap gap-1">
              {loc.organizations.map((org: any) => (
                <Chip key={org.id} variant={org.is_primary ? "warning" : "neutral"}>
                  {org.name}
                </Chip>
              ))}
            </div>
          ) },
          { header: "Status", cell: (loc: any) => (
            <Chip variant={loc.is_active ? "success" : "neutral"}>
              {loc.is_active ? "Active" : "Inactive"}
            </Chip>
          ) },
          { header: "Action", className: "text-right", cell: (loc: any) => (
            <Button variant="ghost" size="sm" onClick={() => onEditLocation(loc)}>
              <Icon name="edit" />
            </Button>
          ) },
        ]}
        data={locations}
        emptyTitle="No office locations" 
        emptyDescription="Register at least one location to enable geofenced attendance."
      />
    </div>
  );
}
