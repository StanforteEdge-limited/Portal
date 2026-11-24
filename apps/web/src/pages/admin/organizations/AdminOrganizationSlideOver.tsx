import { useState, useEffect, useRef } from "react";
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
import { BRAND_THEMES } from "@stanforte/shared";
import { uploadFileAsset, getPresignedFileUrl } from "@/pages/files/files-api";
import {
  DEFAULT_PRIMARY_COLOR,
  dispatchBrandingUpdate,
  normalizeHexColor,
} from "@/shared/branding/BrandingProvider";

type Props = {
  org?: any | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminOrganizationSlideOver({ org, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    organization_type: "venture",
    is_active: true,
    parent_organization_id: "",
    theme: "ocean",
    primary_color: "",
    logo_file_id: "",
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
      const logoFileId = typeof metadata.logo_file_id === "string" ? metadata.logo_file_id : "";
      const logoUrl = typeof metadata.logo_url === "string" ? metadata.logo_url : "";
      setForm({
        name: org.name ?? "",
        code: org.code ?? "",
        organization_type: org.organizationType ?? "venture",
        is_active: org.isActive ?? true,
        parent_organization_id: org.parentOrganizationId ? String(org.parentOrganizationId) : "",
        theme: metadata.theme ?? "ocean",
        primary_color: typeof metadata.primary_color === "string" ? metadata.primary_color : "",
        logo_file_id: logoFileId,
        logo_url: logoUrl,
        address: metadata.address ?? "",
        phone: metadata.phone ?? "",
        website: metadata.website ?? "",
        signature_template: metadata.signature_template ?? "",
      });
      if (logoFileId) {
        getPresignedFileUrl(logoFileId, { inline: true, expiresInSeconds: 3600 })
          .then((url) => setLogoPreviewUrl(url || logoUrl || null))
          .catch(() => setLogoPreviewUrl(logoUrl || null));
      } else {
        setLogoPreviewUrl(logoUrl || null);
      }
    }
  }, [org]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const asset = await uploadFileAsset(file, {
        organization_id: org ? String(org.id) : undefined,
        metadata: { purpose: "branding_logo" },
      });
      setForm((p) => ({ ...p, logo_file_id: asset.id, logo_url: asset.public_url ?? "" }));
      const preview = await getPresignedFileUrl(asset.id, {
        inline: true,
        expiresInSeconds: 3600,
      }).catch(() => asset.public_url ?? null);
      setLogoPreviewUrl(preview);
      showToast({
        tone: "success",
        title: "Logo uploaded",
        message: "Logo saved. It will appear in the portal after saving the organization.",
      });
    } catch (err) {
      console.error("Logo upload failed", err);
      showToast({ tone: "danger", title: "Error", message: "Failed to upload logo." });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showToast({ tone: "danger", title: "Error", message: "Name and Code are required." });
      return;
    }
    const normalizedColor = form.primary_color.trim()
      ? normalizeHexColor(form.primary_color)
      : null;
    if (form.primary_color.trim() && !normalizedColor) {
      showToast({
        tone: "danger",
        title: "Invalid color",
        message: "Primary color must be a valid 6-digit hex code (e.g. #2563eb).",
      });
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
        logo_file_id: form.logo_file_id || null,
        logo_url: form.logo_url || null,
        primary_color: normalizedColor,
        theme: form.theme,
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
      dispatchBrandingUpdate({
        primaryColor: normalizedColor ?? undefined,
        logoFileId: form.logo_file_id || null,
        logoUrl: form.logo_url || null,
      });
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

          <div className="border-t border-neutral-100 my-4 pt-4">
            <h4 className="text-sm font-semibold text-neutral-800 mb-3">Branding</h4>
            <div className="space-y-4">
              <SelectField
                label="Color Theme"
                value={form.theme}
                onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}
                helpText="Predefined platform themes. Applies across the portal for this organization."
              >
                {BRAND_THEMES.map((theme) => (
                  <option key={theme.key} value={theme.key}>
                    {theme.label}
                  </option>
                ))}
              </SelectField>
              <div>
                <span className="field-label">Primary Brand Color</span>
                <div className="flex items-center gap-2.5">
                  <label className="relative h-9 w-11 rounded-lg border border-neutral-200 overflow-hidden cursor-pointer shrink-0">
                    <input
                      type="color"
                      value={normalizeHexColor(form.primary_color) ?? DEFAULT_PRIMARY_COLOR}
                      onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                      aria-label="Pick organization primary color"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span
                      className="block h-full w-full"
                      style={{
                        backgroundColor:
                          normalizeHexColor(form.primary_color) ?? DEFAULT_PRIMARY_COLOR,
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                    placeholder="#ff6900 (inherits workspace default)"
                    maxLength={7}
                    className="input-base font-mono text-sm"
                  />
                  {form.primary_color && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((p) => ({ ...p, primary_color: "" }))}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <span className="field-label">Logo</span>
                <div className="flex items-center gap-3">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Organization logo"
                      className="h-12 w-12 rounded-xl border border-neutral-200 bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-surface-container-low text-neutral-400">
                      <Icon name="image" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                    </Button>
                    {form.logo_file_id || form.logo_url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm((p) => ({ ...p, logo_file_id: "", logo_url: "" }));
                          setLogoPreviewUrl(null);
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              <TextField
                label="Logo URL"
                value={form.logo_url}
                onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png or a generated upload URL"
              />
            </div>
          </div>
            <div className="border-t border-neutral-100 my-4 pt-4">
              <h4 className="text-sm font-semibold text-neutral-800 mb-3">Corporate Metadata</h4>
            <div className="space-y-4">
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
