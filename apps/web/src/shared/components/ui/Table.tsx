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
    <div className="w-full overflow-x-auto">
      <table className={["min-w-full text-left", className].filter(Boolean).join(" ")} {...props}>
        {caption ? <caption className={captionClassName || "sr-only"}>{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50">{children}</thead>;
}

export function TableHeaderRow({ children }: { children: ReactNode }) {
  return <tr className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">{children}</tr>;
}

export function TableHeaderCell({ children, className, ...props }: HeaderCellProps) {
  return (
    <th className={["px-3 py-2", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className, onClick, ...props }: RowProps) {
  return (
    <tr
      className={["border-t border-slate-100 bg-white", onClick ? "cursor-pointer hover:bg-slate-50" : "", className]
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
    <td className={["px-3 py-2.5", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </td>
  );
}
