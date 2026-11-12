import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { X, Save, User, MapPin, Briefcase, Phone, Calendar } from "lucide-react";
import { updateWorkspaceProfile } from "@/shared/api/workspace-api";
import { useToast } from "@/shared";

interface ProfileEditorSlideOverProps {
  open: boolean;
  onClose: () => void;
  profile: any;
  onSaved: () => void;
}

export default function ProfileEditorSlideOver({
  open,
  onClose,
  profile,
  onSaved,
}: ProfileEditorSlideOverProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    date_of_birth: "",
    gender: "",
    nationality: "",
    state: "",
    lga: "",
    marital_status: "",
    occupation: "",
    bio: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      phone: profile.phone || "",
      address: profile.address || "",
      date_of_birth: profile.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : "",
      gender: profile.gender || "",
      nationality: profile.nationality || "",
      state: profile.state || "",
      lga: profile.lga || "",
      marital_status: profile.marital_status || "",
      occupation: profile.occupation || "",
      bio: profile.bio || "",
    });
  }, [profile, open]);

  if (!open) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await updateWorkspaceProfile({
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender.trim() || undefined,
        nationality: form.nationality.trim() || undefined,
        state: form.state.trim() || undefined,
        lga: form.lga.trim() || undefined,
        marital_status: form.marital_status.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });
      showToast({ tone: "success", title: "Saved", message: "Your profile has been updated successfully." });
      onSaved();
      onClose();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Update failed",
        message: err instanceof Error ? err.message : "Unable to save profile changes.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-slate-200/80 bg-slate-50/75 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0a1128] text-white flex items-center justify-center font-bold">
                <User className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-headline">
                  Edit Personal Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Update your contact, biographical, and regional information
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form id="profile-editor-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Basic Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <User className="w-3.5 h-3.5" />
                <span>Personal Identity</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <DateInput
                    
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <SelectBox
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </SelectBox>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
                  <SelectBox
                    value={form.marital_status}
                    onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  >
                    <option value="">Select status...</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </SelectBox>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +234 801 234 5678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Residential & Regional Origin */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Address &amp; Regional Origin</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Street address, city"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Lagos"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LGA</label>
                  <input
                    type="text"
                    placeholder="e.g. Ikeja"
                    value={form.lga}
                    onChange={(e) => setForm({ ...form, lga: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    placeholder="e.g. Nigerian"
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Professional & Bio */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Professional Summary</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation / Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Financial Analyst"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bio / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Brief personal background, expertise, or responsibilities..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                />
              </div>
            </div>
          </form>

          {/* Sticky Footer */}
          <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="profile-editor-form"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-95 text-white font-bold text-xs shadow-sm shadow-orange-500/25 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

