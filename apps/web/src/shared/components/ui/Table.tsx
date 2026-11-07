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
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
      <table className={["min-w-full text-left border-collapse", className].filter(Boolean).join(" ")} {...props}>
        {caption ? <caption className={captionClassName || "sr-only"}>{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50/80 border-b border-slate-200/80">{children}</thead>;
}

export function TableHeaderRow({ children }: { children: ReactNode }) {
  return <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</tr>;
}

export function TableHeaderCell({ children, className, ...props }: HeaderCellProps) {
  return (
    <th className={["px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TableRow({ children, className, onClick, ...props }: RowProps) {
  return (
    <tr
      className={["bg-white transition-colors", onClick ? "cursor-pointer hover:bg-slate-50/70" : "hover:bg-slate-50/40", className]
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
    <td className={["px-4 py-3.5 text-xs text-slate-700", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </td>
  );
}
