import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { DatePicker, DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";

export { DatePicker, DateInput, SelectBox };

type FieldShellProps = {
  label: string;
  helpText?: string;
  error?: string;
  children: ReactNode;
};

function FieldShell({ label, helpText, error, children }: FieldShellProps) {
  return (
    <div className="block">
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {error ? (
        <p className="field-help mt-2 text-danger">{error}</p>
      ) : helpText ? (
        <p className="field-help">{helpText}</p>
      ) : null}
    </div>
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
      <SelectBox className={className} {...props}>
        {children}
      </SelectBox>
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
      <SelectBox value={value} onValueChange={onChange} className={className}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </SelectBox>
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
