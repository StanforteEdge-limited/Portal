import type { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helpText?: string;
};

export function TextInput({ label, error, helpText, className = "", ...props }: TextInputProps) {
  return (
    <label className="block">
      {label && <span className="field-label">{label}</span>}
      <input className={["input-base", error && "border-danger", className].filter(Boolean).join(" ")} {...props} />
      {error ? (
        <p className="field-help mt-2 text-danger">{error}</p>
      ) : helpText ? (
        <p className="field-help">{helpText}</p>
      ) : null}
    </label>
  );
}
