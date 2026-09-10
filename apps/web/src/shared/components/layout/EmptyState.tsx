import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="shell-panel flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-900/8 text-brand-900">
        <Icon name="inbox" fill />
      </div>
      <div className="max-w-md">
        <h3 className="font-headline text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? action : null}
    </div>
  );
}
