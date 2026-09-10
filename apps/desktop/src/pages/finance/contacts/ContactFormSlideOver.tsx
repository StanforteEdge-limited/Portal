import {
  Button,
  SelectField,
  SlideOver,
  SlideOverContent,
  SlideOverFooter,
  SlideOverHeader,
  TextField,
} from "@/shared";
import type { ContactRecord } from "@stanforte/shared";
import { ContactPersonForm } from "./ContactPersonForm";
import type { ContactFormState, ContactPersonFormState } from "./helpers";
import { emptyContactForm, contactPersonFromRecord } from "./helpers";

type Props = {
  open: boolean;
  onClose: () => void;
  editing: ContactRecord | null;
  contactType: "customer" | "vendor" | "both";
  form: ContactFormState;
  setForm: React.Dispatch<React.SetStateAction<ContactFormState>>;
  saving: boolean;
  onSave: () => void;
};

export function ContactFormSlideOver({
  open,
  onClose,
  editing,
  contactType,
  form,
  setForm,
  saving,
  onSave,
}: Props) {
  const label = contactType === "vendor" ? "Vendor" : contactType === "customer" ? "Customer" : "Contact";
  
  const setPersons: React.Dispatch<React.SetStateAction<ContactPersonFormState[]>> = (action) => {
    setForm((f) => ({
      ...f,
      contact_persons: typeof action === "function" ? action(f.contact_persons) : action,
    }));
  };

  const showBusinessFields = form.sub_type === "business";

  return (
    <SlideOver open={open} onClose={onClose} size="lg">
      <SlideOverHeader
        title={editing ? `Edit ${label}` : `New ${label}`}
        subtitle={editing ? editing.name : `Add a new ${label.toLowerCase()} account.`}
        onClose={onClose}
      />
      <SlideOverContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Type" value={form.contact_type} onChange={(e) => setForm((f) => ({ ...f, contact_type: e.target.value as any }))}>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="both">Both</option>
            </SelectField>
            <SelectField label="Sub Type" value={form.sub_type} onChange={(e) => setForm((f) => ({ ...f, sub_type: e.target.value as any }))}>
              <option value="business">Business</option>
              <option value="individual">Individual</option>
            </SelectField>
          </div>
          <TextField label={showBusinessFields ? "Contact Name" : "Full Name"} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={showBusinessFields ? "Primary contact person" : "Full name"} />
          {showBusinessFields && (
            <>
              <TextField label="Company Name" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Registered company name" />
              <TextField label="Legal Name" value={form.legal_name} onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))} placeholder="Legal / registered name" />
            </>
          )}
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+234..." />
          <TextField label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
          <TextField label="Tax Number" value={form.tax_number} onChange={(e) => setForm((f) => ({ ...f, tax_number: e.target.value }))} placeholder="TIN-12345" />
          <TextField label="Website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Payment Terms (days)" value={form.payment_terms} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} placeholder="30" />
            {form.contact_type !== "vendor" && (
              <TextField label="Credit Limit" value={form.credit_limit} onChange={(e) => setForm((f) => ({ ...f, credit_limit: e.target.value }))} placeholder="50000" />
            )}
            {form.contact_type !== "customer" && (
              <TextField label="Opening Balance" value={form.opening_balance} onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))} placeholder="0" />
            )}
          </div>
          <TextField label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." />
          <SelectField label="Status" value={form.is_active ? "true" : "false"} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "true" }))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </SelectField>

          {showBusinessFields && (
            <ContactPersonForm persons={form.contact_persons} setPersons={setPersons} />
          )}
        </div>
      </SlideOverContent>
      <SlideOverFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : editing ? `Update ${label}` : `Create ${label}`}</Button>
      </SlideOverFooter>
    </SlideOver>
  );
}