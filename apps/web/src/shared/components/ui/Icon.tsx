type IconProps = {
  name: string;
  className?: string;
  fill?: boolean;
};

export function Icon({ name, className, fill = false }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "material-symbols-outlined",
        fill ? "material-symbols-outlined-fill" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={fill ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
    >
      {name}
    </span>
  );
}
