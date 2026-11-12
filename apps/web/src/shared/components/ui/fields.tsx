import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

type FieldShellProps = {
  label: string;
  helpText?: string;
  error?: string;
  children: ReactNode;
};

function FieldShell({ label, helpText, error, children }: FieldShellProps) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error ? (
        <p className="field-help mt-2 text-danger">{error}</p>
      ) : helpText ? (
        <p className="field-help">{helpText}</p>
      ) : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helpText?: string;
  error?: string;
};

export function TextField({
  label,
  helpText,
  error,
  className,
  type,
  ...props
}: InputProps) {
  if (type === "date") {
    return (
      <FieldShell label={label} helpText={helpText} error={error}>
        <DatePicker
          value={props.value as string}
          onChange={(val) => {
            props.onChange?.({ target: { value: val, name: props.name } } as any);
          }}
          disabled={props.disabled}
          placeholder={props.placeholder || "Select date"}
          className={className}
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell label={label} helpText={helpText} error={error}>
      <input type={type} className={["input-base", className].filter(Boolean).join(" ")} {...props} />
    </FieldShell>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  helpText?: string;
  error?: string;
};

export function SelectField({
  label,
  helpText,
  error,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <FieldShell label={label} helpText={helpText} error={error}>
      <div className="relative">
        <select
          className={[
            "input-base appearance-none pr-9 cursor-pointer",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </FieldShell>
  );
}

type SelectOption = { label: string; value: string };

type SelectComponentProps = {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  error?: string;
  className?: string;
};

export function Select({
  label,
  options,
  value,
  onChange,
  helpText,
  error,
  className,
}: SelectComponentProps) {
  return (
    <FieldShell label={label} helpText={helpText} error={error}>
      <ShadcnSelect value={value} onValueChange={onChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
    </FieldShell>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helpText?: string;
  error?: string;
};

export function TextAreaField({
  label,
  helpText,
  error,
  className,
  ...props
}: TextareaProps) {
  return (
    <FieldShell label={label} helpText={helpText} error={error}>
      <textarea
        className={["input-base min-h-32 resize-y", className].filter(Boolean).join(" ")}
        {...props}
      />
    </FieldShell>
  );
}
