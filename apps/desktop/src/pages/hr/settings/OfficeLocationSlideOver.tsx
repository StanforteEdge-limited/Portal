import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  SelectField,
  useToast,
  SectionCard,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { resourceApi, attendanceApi } from "@/shared/lib/core";
import { type OfficeLocation, type OrganizationItem } from "@/shared";

type Props = {
  location?: OfficeLocation | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function OfficeLocationSlideOver({ location, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);

  const [name, setName] = useState(location?.name || "");
  const [address, setAddress] = useState(location?.address || "");
  const [latitude, setLatitude] = useState(location?.latitude || 0);
  const [longitude, setLongitude] = useState(location?.longitude || 0);
  const [radius, setRadius] = useState(location?.radius_meters || 200);
  const [isActive, setIsActive] = useState(location?.is_active ?? true);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  useEffect(() => {
    resourceApi.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
    if (location) {
      setSelectedOrgIds(location.organizations.map((o: { id: string }) => o.id));
    }
  }, [location]);

  function toggleOrg(id: string) {
    setSelectedOrgIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({ tone: "warning", title: "Required", message: "Location name is required." });
      return;
    }
    try {
      setSaving(true);
      await attendanceApi.saveOfficeLocation({
        name: name.trim(),
        address: address.trim() || undefined,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius_meters: Number(radius),
        is_active: isActive,
        organization_ids: selectedOrgIds,
      }, location?.id);

      showToast({ tone: "success", title: "Saved", message: `Office location ${location ? "updated" : "created"}.` });
      onSaved();
    } catch (err) {
      showToast({ tone: "danger", title: "Failed", message: err instanceof Error ? err.message : "Unable to save location." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="lg">
      <SlideOverHeader
        title={location ? "Edit Location" : "Add Office Location"}
        subtitle="Settings"
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Basic Info">
          <div className="grid gap-4">
            <TextField 
              label="Location Name" 
              placeholder="e.g. Lagos Head Office" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
            <TextField 
              label="Full Address" 
              placeholder="Street address..." 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
            />
            <div>
              <p className="field-label mb-2">Attached Organizations</p>
              <div className="grid gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
                {orgs.map((o) => (
                  <label key={o.id} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedOrgIds.includes(o.id)} 
                      onChange={() => toggleOrg(o.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-900"
                    />
                    <span className="text-sm text-slate-700">{o.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Geofence Controls">
          <p className="mb-4 text-xs text-slate-500">
            Attendance clock-ins are validated against these coordinates.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField 
              label="Latitude" 
              type="number" 
              step="any"
              value={latitude} 
              onChange={(e) => setLatitude(Number(e.target.value))} 
            />
            <TextField 
              label="Longitude" 
              type="number" 
              step="any"
              value={longitude} 
              onChange={(e) => setLongitude(Number(e.target.value))} 
            />
            <TextField 
              label="Radius (Meters)" 
              type="number" 
              value={radius} 
              onChange={(e) => setRadius(Number(e.target.value))} 
            />
             <div className="flex items-center gap-3 pt-6">
              <input 
                type="checkbox" 
                id="loc-active"
                checked={isActive} 
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-900"
              />
              <label htmlFor="loc-active" className="text-sm font-medium text-slate-700">Active Location</label>
            </div>
          </div>
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Saving..." : "Save Location"}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
