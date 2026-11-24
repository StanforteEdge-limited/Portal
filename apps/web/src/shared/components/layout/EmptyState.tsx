import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="shell-panel flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-200/60 bg-orange-50 text-[#ff6900]">
        {icon ?? <Inbox className="h-5 w-5" strokeWidth={1.75} />}
      </div>
      <div className="max-w-md">
        <h3 className="font-headline text-base font-medium tracking-tight text-neutral-900">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>
      </div>
      {action ? action : null}
    </div>
  );
}
