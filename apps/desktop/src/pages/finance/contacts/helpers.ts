import { formatCurrency } from "@stanforte/shared";
import type { ContactPersonRecord } from "@stanforte/shared";

export function asMoney(value: unknown, currency = "NGN") {
  const amount = Number(value || 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, currency);
}

export function asDate(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "-";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
}

export type ContactFormState = {
  contact_type: "customer" | "vendor" | "both";
  sub_type: "individual" | "business";
  name: string;
  company_name: string;
  legal_name: string;
  email: string;
  phone: string;
  address: string;
  billing_address: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  tax_number: string;
  is_taxable: boolean;
  is_active: boolean;
  payment_terms: string;
  credit_limit: string;
  opening_balance: string;
  website: string;
  notes: string;
  contact_persons: ContactPersonFormState[];
};

export type ContactPersonFormState = {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  designation: string;
  department: string;
  is_primary: boolean;
};

export const emptyPerson: ContactPersonFormState = {
  salutation: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  mobile: "",
  designation: "",
  department: "",
  is_primary: false,
};

export function emptyContactForm(contactType: "customer" | "vendor" | "both" = "customer"): ContactFormState {
  return {
    contact_type: contactType,
    sub_type: "business",
    name: "",
    company_name: "",
    legal_name: "",
    email: "",
    phone: "",
    address: "",
    billing_address: null,
    shipping_address: null,
    tax_number: "",
    is_taxable: true,
    is_active: true,
    payment_terms: "",
    credit_limit: "",
    opening_balance: "",
    website: "",
    notes: "",
    contact_persons: [{ ...emptyPerson, is_primary: true }],
  };
}

export const emptyForm = emptyContactForm;

export function contactPersonFromRecord(r: ContactPersonRecord): ContactPersonFormState {
  return {
    salutation: r.salutation || "",
    first_name: r.first_name || "",
    last_name: r.last_name || "",
    email: r.email || "",
    phone: r.phone || "",
    mobile: r.mobile || "",
    designation: r.designation || "",
    department: r.department || "",
    is_primary: r.is_primary,
  };
}