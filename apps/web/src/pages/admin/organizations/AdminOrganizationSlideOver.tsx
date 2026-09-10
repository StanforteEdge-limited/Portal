import { useState, useEffect } from "react";
import {
  Button,
  Icon,
  SlideOver,
  SlideOverPanel,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
  TextField,
  SelectField,
  TextAreaField,
  useToast,
} from "@/shared";
import { httpRequest } from "@/shared/lib/core";

type Props = {
  org?: any | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminOrganizationSlideOver({ org, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    organization_type: "venture",
    is_active: true,
    parent_organization_id: "",
    logo_url: "",
    address: "",
    phone: "",
    website: "",
    signature_template: "",
  });
  const [parentOrgs, setParentOrgs] = useState<any[]>([]);

  useEffect(() => {
    // Load parent org options
    const loadParentOrgs = async () => {
      try {
        const res = await httpRequest<any>("/organizations");
        const list = res?.data?.items ?? [];
        // Filter out current org to prevent circular parent relation
        setParentOrgs(list.filter((o: any) => !org || String(o.id) !== String(org.id)));
      } catch (err) {
        console.error("Failed to load parent organizations list", err);
      }
    };
    void loadParentOrgs();

    if (org) {
      const metadata = org.metadata && typeof org.metadata === "object" ? org.metadata : {};
      setForm({
        name: org.name ?? "",
        code: org.code ?? "",
        organization_type: org.organizationType ?? "venture",
        is_active: org.isActive ?? true,
        parent_organization_id: org.parentOrganizationId ? String(org.parentOrganizationId) : "",
        logo_url: metadata.logo_url ?? "",
        address: metadata.address ?? "",
        phone: metadata.phone ?? "",
        website: metadata.website ?? "",
        signature_template: metadata.signature_template ?? "",
      });
    }
  }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showToast({ tone: "danger", title: "Error", message: "Name and Code are required." });
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      code: form.code,
      organization_type: form.organization_type,
      is_active: form.is_active,
      parent_organization_id: form.parent_organization_id || undefined,
      metadata: {
        logo_url: form.logo_url,
        address: form.address,
        phone: form.phone,
        website: form.website,
        signature_template: form.signature_template,
      },
    };

    try {
      if (org) {
        await httpRequest(`/organizations/${org.id}`, {
          method: "PUT",
          body: payload,
        });
        showToast({ tone: "success", title: "Success", message: "Organization updated successfully." });
      } else {
        await httpRequest("/organizations", {
          method: "POST",
          body: payload,
        });
        showToast({ tone: "success", title: "Success", message: "Organization created successfully." });
      }
      onSaved();
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to save organization." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full">
        <SlideOverHeader
          title={org ? "Edit Organization" : "Add Organization"}
          onClose={onClose}
        />
        <SlideOverContent className="space-y-4">
          <TextField
            label="Organization Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g., Stanforte Edge Ltd"
            required
          />
          <TextField
            label="Code"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="e.g., STE"
            required
            disabled={!!org}
          />
          <SelectField
            label="Organization Type"
            value={form.organization_type}
            onChange={(e) => setForm((p) => ({ ...p, organization_type: e.target.value }))}
          >
            <option value="venture">Venture</option>
            <option value="group">Group</option>
            <option value="shared_function">Shared Function</option>
          </SelectField>
          <SelectField
            label="Status"
            value={form.is_active ? "true" : "false"}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "true" }))}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>
          <SelectField
            label="Parent Organization"
            value={form.parent_organization_id}
            onChange={(e) => setForm((p) => ({ ...p, parent_organization_id: e.target.value }))}
          >
            <option value="">None</option>
            {parentOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectField>

          <div className="border-t border-slate-100 my-4 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Corporate Metadata</h4>
            <div className="space-y-4">
              <TextField
                label="Logo URL"
                value={form.logo_url}
                onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                placeholder="e.g., https://example.com/logo.png"
              />
              <TextField
                label="Contact Phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="e.g., +234 800 000 0000"
              />
              <TextField
                label="Website URL"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="e.g., https://stanforteedge.com"
              />
              <TextField
                label="Office Address"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="e.g., 123 Innovation Drive, Yaba, Lagos"
              />
              <TextAreaField
                label="Default Email Signature Template"
                value={form.signature_template}
                onChange={(e) => setForm((p) => ({ ...p, signature_template: e.target.value }))}
                placeholder="HTML signature template with {{firstName}}, {{lastName}}, {{title}}, {{email}}, {{phone}}, {{companyName}}, {{logoUrl}}"
                helpText="Placeholders: {{firstName}}, {{lastName}}, {{title}}, {{email}}, {{phone}}, {{companyName}}, {{logoUrl}}, {{website}}, {{address}}. Use {{#phone}}...{{/phone}} for conditional sections."
              />
            </div>
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
