import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, SectionCard, TextField, useToast } from "@/shared";
import { hrApi } from "@/shared/lib/core";

export default function EmployeeOnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", address: "", nationality: "" });

  useEffect(() => {
    void hrApi.getMyOnboarding().then((result) => {
      setData(result);
      setForm((current) => ({
        ...current,
        first_name: result?.user?.first_name ?? "",
        last_name: result?.user?.last_name ?? "",
        phone: result?.user?.phone ?? "",
        address: result?.user?.address ?? "",
        nationality: result?.user?.nationality ?? "",
      }));
    }).catch(() => showToast({ tone: "danger", title: "Unable to load onboarding", message: "Please try again." })).finally(() => setLoading(false));
  }, [showToast]);

  async function saveProfile() {
    setSaving(true);
    try {
      const result = await hrApi.updateMyOnboarding({ action: "save_profile", payload: form });
      setData(result);
      showToast({ tone: "success", title: "Profile saved", message: "Your onboarding profile is up to date." });
    } catch (error) {
      showToast({ tone: "danger", title: "Save failed", message: error instanceof Error ? error.message : "Unable to save profile." });
    } finally { setSaving(false); }
  }

  async function finish() {
    setSaving(true);
    try {
      const result = await hrApi.updateMyOnboarding({ action: "complete_step", step_key: "review" });
      setData(result);
      showToast({ tone: "success", title: "Onboarding submitted", message: "Your profile is ready for HR review." });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      showToast({ tone: "danger", title: "Submission failed", message: error instanceof Error ? error.message : "Unable to submit onboarding." });
    } finally { setSaving(false); }
  }

  if (loading) return <main className="mx-auto max-w-3xl p-8 text-sm text-slate-500">Loading onboarding...</main>;

  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
    <div><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Employee onboarding</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Complete your profile</h1><p className="mt-2 text-slate-600">Save your details, then submit them for HR review.</p></div>
    <SectionCard title="Personal details" description={`Current status: ${data?.progress?.status ?? "profile_pending"}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
        <TextField label="Last name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
        <TextField label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <TextField label="Nationality" value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} />
        <TextField label="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="sm:col-span-2" />
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => void saveProfile()} disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button><Button variant="secondary" onClick={() => void finish()} disabled={saving}>Submit onboarding</Button></div>
    </SectionCard>
  </main>;
}
