import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20",
  {
    variants: {
      variant: {
        default:
          "border-orange-200/60 bg-orange-50 text-[#ff6900] hover:bg-orange-100",
        secondary:
          "border-slate-200/60 bg-slate-100 text-slate-700 hover:bg-slate-200/80",
        destructive:
          "border-rose-200/60 bg-rose-50 text-rose-700 hover:bg-rose-100",
        outline: "border-slate-200 text-slate-800 bg-white",
        success:
          "border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        warning:
          "border-amber-200/60 bg-amber-50 text-amber-700 hover:bg-amber-100",
        info:
          "border-blue-200/60 bg-blue-50 text-blue-700 hover:bg-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
