import type { ReactNode, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  caption?: string;
  captionClassName?: string;
  children: ReactNode;
};

type RowProps = TableHTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
  className?: string;
};

type CellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
};

type HeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
};

export function Table({
  caption,
  captionClassName,
  className,
  children,
  ...props
}: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-neutral-900/[0.08] shadow-xs bg-white">
      <table className={["min-w-full text-left border-collapse", className].filter(Boolean).join(" ")} {...props}>
        {caption ? <caption className={captionClassName || "sr-only"}>{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-neutral-50 border-b border-neutral-900/[0.08]">{children}</thead>;
}

export function TableHeaderRow({ children }: { children: ReactNode }) {
  return <tr className="text-xs font-medium text-neutral-500">{children}</tr>;
}

export function TableHeaderCell({ children, className, ...props }: HeaderCellProps) {
  return (
    <th
      className={["px-4 py-3 text-xs font-medium text-neutral-500", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-neutral-900/[0.06]">{children}</tbody>;
}

export function TableRow({ children, className, onClick, ...props }: RowProps) {
  return (
    <tr
      className={[
        "bg-white transition-colors duration-150 focus-within:bg-neutral-50",
        onClick ? "cursor-pointer hover:bg-neutral-50" : "hover:bg-neutral-50/70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className, ...props }: CellProps) {
  return (
    <td
      className={["px-4 py-3 text-sm text-neutral-800 tabular-nums", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </td>
  );
}
