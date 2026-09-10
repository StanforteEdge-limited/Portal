import { ReactNode } from "react";
import {
  Table,
  TableHead,
  TableHeaderRow,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "./Table";
import { PaginationControls } from "./PaginationControls";
import { EmptyState } from "../layout/EmptyState";

export interface ColumnDef<T> {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: PaginationProps;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  caption,
  emptyTitle = "No data",
  emptyDescription = "There are no records to display.",
  pagination,
  onRowClick,
}: DataTableProps<T>) {
  if (error) {
    return <p className="text-sm text-danger my-4">{error}</p>;
  }

  return (
    <>
      {loading && !data.length ? (
        <p className="text-sm text-slate-500 my-4">Loading...</p>
      ) : data.length ? (
        <>
          <Table caption={caption}>
            <TableHead>
              <TableHeaderRow>
                {columns.map((col, idx) => (
                  <TableHeaderCell key={idx} className={col.className}>
                    {col.header}
                  </TableHeaderCell>
                ))}
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {data.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagination && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              showStatus={false}
              perPage={pagination.perPage}
              onPerPageChange={pagination.onPerPageChange}
              onPageChange={pagination.onPageChange}
            />
          )}
        </>
      ) : !loading ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
    </>
  );
}
