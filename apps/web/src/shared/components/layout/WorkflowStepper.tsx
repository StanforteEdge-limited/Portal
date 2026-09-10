import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";

export type WorkflowStepStatus = "complete" | "current" | "upcoming";

export type WorkflowStep = {
  label: string;
  detail?: ReactNode;
  status: WorkflowStepStatus;
};

type WorkflowStepperProps = {
  steps: WorkflowStep[];
};

const statusStyles: Record<WorkflowStepStatus, string> = {
  complete: "border-success bg-success text-white",
  current: "border-brand-900 bg-brand-900 text-white",
  upcoming: "border-slate-200 bg-white text-slate-500",
};

const statusIcons: Record<WorkflowStepStatus, string> = {
  complete: "done",
  current: "schedule",
  upcoming: "radio_button_unchecked",
};

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <ol className="space-y-3" aria-label="Workflow progress">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-3">
          <span
            className={[
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[18px]",
              statusStyles[step.status],
            ].join(" ")}
            aria-hidden="true"
          >
            <Icon name={statusIcons[step.status]} fill={step.status !== "upcoming"} className="text-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">{step.label}</p>
            {step.detail ? <div className="mt-1 text-sm leading-6 text-slate-500">{step.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
