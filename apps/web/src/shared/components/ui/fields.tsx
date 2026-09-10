import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
  ...props
}: InputProps) {
  return (
    <FieldShell label={label} helpText={helpText} error={error}>
      <input className={["input-base", className].filter(Boolean).join(" ")} {...props} />
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
      <select className={["input-base", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </select>
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
      <select
        className={["input-base", className].filter(Boolean).join(" ")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
