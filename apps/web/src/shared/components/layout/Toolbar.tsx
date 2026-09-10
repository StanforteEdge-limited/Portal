import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";

type ToolbarProps = {
  title?: string;
  chips?: string[];
  actionLabel?: string;
};

export function Toolbar({ title, chips = [], actionLabel }: ToolbarProps) {
  return (
    <div className="shell-panel flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {title ? (
          <p className="mr-2 font-headline text-sm font-semibold text-slate-950">
            {title}
          </p>
        ) : null}
        {chips.map((chip) => (
          <Chip key={chip} variant="neutral">
            {chip}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" className="gap-2">
          <Icon name="filter_alt" />
          Filter
        </Button>
        <Button variant="secondary" size="sm" className="gap-2">
          <Icon name="calendar_month" />
          Date
        </Button>
        {actionLabel ? (
          <Button size="sm" className="gap-2">
            <Icon name="add" />
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
