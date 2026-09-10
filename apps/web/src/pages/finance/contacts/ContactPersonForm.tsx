import { Button, Icon, SelectField, TextField } from "@/shared";
import type { ContactPersonFormState } from "./helpers";
import { emptyPerson } from "./helpers";

type Props = {
  persons: ContactPersonFormState[];
  setPersons: React.Dispatch<React.SetStateAction<ContactPersonFormState[]>>;
  readOnly?: boolean;
};

export function ContactPersonForm({ persons, setPersons, readOnly }: Props) {
  function update(index: number, field: keyof ContactPersonFormState, value: string | boolean) {
    setPersons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "is_primary" && value === true) {
        next.forEach((p, i) => {
          if (i !== index) next[i] = { ...next[i], is_primary: false };
        });
      }
      return next;
    });
  }

  function addPerson() {
    setPersons((prev) => [...prev, { ...emptyPerson }]);
  }

  function removePerson(index: number) {
    setPersons((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Contact Persons</h3>
        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={addPerson}>
            <Icon name="add" className="text-[16px]" /> Add
          </Button>
        )}
      </div>
      {persons.map((person, idx) => (
        <div key={idx} className="grid gap-3 rounded-md border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Person {idx + 1}</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={person.is_primary}
                  onChange={(e) => update(idx, "is_primary", e.target.checked)}
                  disabled={readOnly}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                Primary
              </label>
              {!readOnly && persons.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removePerson(idx)}>
                  <Icon name="delete" className="text-[16px] text-danger" />
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Salutation" value={person.salutation} onChange={(e) => update(idx, "salutation", e.target.value)} disabled={readOnly}>
              <option value="">None</option>
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Dr.">Dr.</option>
            </SelectField>
            <div />
            <TextField label="First Name" value={person.first_name} onChange={(e) => update(idx, "first_name", e.target.value)} disabled={readOnly} placeholder="John" />
            <TextField label="Last Name" value={person.last_name} onChange={(e) => update(idx, "last_name", e.target.value)} disabled={readOnly} placeholder="Doe" />
            <TextField label="Email" type="email" value={person.email} onChange={(e) => update(idx, "email", e.target.value)} disabled={readOnly} placeholder="john@example.com" />
            <TextField label="Phone" value={person.phone} onChange={(e) => update(idx, "phone", e.target.value)} disabled={readOnly} placeholder="+234..." />
            <TextField label="Mobile" value={person.mobile} onChange={(e) => update(idx, "mobile", e.target.value)} disabled={readOnly} placeholder="+234..." />
            <TextField label="Designation" value={person.designation} onChange={(e) => update(idx, "designation", e.target.value)} disabled={readOnly} placeholder="CEO" />
            <TextField label="Department" value={person.department} onChange={(e) => update(idx, "department", e.target.value)} disabled={readOnly} placeholder="Finance" />
          </div>
        </div>
      ))}
    </div>
  );
}