import * as React from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
  labels: Record<string, React.ReactNode>;
  registerLabel: (val: string, label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function Select({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [labels, setLabels] = React.useState<Record<string, React.ReactNode>>({});

  const isValueControlled = controlledValue !== undefined;
  const value = isValueControlled ? controlledValue : uncontrolledValue;

  const isOpenControlled = controlledOpen !== undefined;
  const open = isOpenControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isOpenControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange]
  );

  const handleValueChange = React.useCallback(
    (nextVal: string) => {
      if (!isValueControlled) {
        setUncontrolledValue(nextVal);
      }
      onValueChange?.(nextVal);
      setOpen(false);
    },
    [isValueControlled, onValueChange, setOpen]
  );

  const registerLabel = React.useCallback((val: string, label: React.ReactNode) => {
    setLabels((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  }, []);

  const ctx = React.useMemo(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      disabled,
      labels,
      registerLabel,
    }),
    [value, handleValueChange, open, setOpen, disabled, labels, registerLabel]
  );

  return (
    <SelectContext.Provider value={ctx}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </SelectContext.Provider>
  );
}

const SelectGroup = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("space-y-0.5", className)}>{children}</div>
);

const SelectValue = ({ placeholder = "Select..." }: { placeholder?: string }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return <span>{placeholder}</span>;
  const displayed = ctx.labels[ctx.value] ?? (ctx.value ? ctx.value : placeholder);
  return <span className="truncate">{displayed}</span>;
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, disabled, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  const isDisabled = disabled ?? ctx?.disabled ?? false;

  return (
    <PopoverTrigger asChild disabled={isDisabled}>
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-medium text-slate-900 shadow-2xs transition hover:border-slate-300 focus:outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform duration-150",
            ctx?.open && "rotate-180 text-[#ff6900]"
          )}
        />
      </button>
    </PopoverTrigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = () => (
  <div className="flex cursor-default items-center justify-center py-1">
    <ChevronUp className="h-4 w-4 text-slate-400" />
  </div>
);

const SelectScrollDownButton = () => (
  <div className="flex cursor-default items-center justify-center py-1">
    <ChevronDown className="h-4 w-4 text-slate-400" />
  </div>
);

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { position?: "popper" | "item-aligned" }
>(({ className, children, ...props }, ref) => (
  <PopoverContent
    ref={ref}
    align="start"
    sideOffset={6}
    className={cn(
      "p-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl",
      className
    )}
    {...props}
  >
    <div className="space-y-0.5">{children}</div>
  </PopoverContent>
));
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2.5 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, children, value, disabled, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  const isSelected = ctx?.value === value;

  React.useEffect(() => {
    ctx?.registerLabel(value, children);
  }, [ctx, value, children]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          ctx?.onValueChange(value);
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl py-2 pl-3 pr-2.5 text-left text-xs font-semibold outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-orange-50/80 text-[#ff6900] font-bold"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="h-3.5 w-3.5 text-[#ff6900] shrink-0" />}
    </button>
  );
});
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-100", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

interface ExtractedOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

function extractOptionsFromChildren(children: React.ReactNode): ExtractedOption[] {
  const raw: ExtractedOption[] = [];
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === React.Fragment) {
        walk((child.props as any).children);
        return;
      }
      const props = child.props as any;
      if (child.type === "option" || (props && "value" in props && child.type !== "optgroup")) {
        const rawVal =
          props.value !== undefined && props.value !== null
            ? String(props.value)
            : typeof props.children === "string" || typeof props.children === "number"
            ? String(props.children)
            : "";
        raw.push({
          value: rawVal,
          label: props.children ?? rawVal,
          disabled: Boolean(props.disabled),
        });
      } else if (props?.children) {
        walk(props.children);
      }
    });
  };
  walk(children);
  return raw;
}

export interface SelectBoxProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

const SelectBox = React.forwardRef<HTMLButtonElement, SelectBoxProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      onValueChange,
      disabled = false,
      className,
      children,
      placeholder = "Select option...",
      name,
      id,
      onClick,
      ...rest
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const options = React.useMemo(() => extractOptionsFromChildren(children), [children]);

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(() => {
      if (defaultValue !== undefined && defaultValue !== null) return String(defaultValue);
      return options[0]?.value ?? "";
    });

    const currentValue = isControlled
      ? value !== null && value !== undefined
        ? String(value)
        : ""
      : internalValue;

    const selectedOption = React.useMemo(() => {
      const exact = options.find((o) => o.value === currentValue);
      if (exact) return exact;
      if (currentValue === "" && options.length > 0) {
        return options.find((o) => o.value === "") || options[0];
      }
      return undefined;
    }, [options, currentValue]);

    const handleSelectOption = (opt: ExtractedOption, e: React.MouseEvent) => {
      e.stopPropagation();
      if (opt.disabled) return;
      if (!isControlled) {
        setInternalValue(opt.value);
      }
      onValueChange?.(opt.value);
      if (onChange) {
        const syntheticEvent = {
          target: { value: opt.value, name: name || "", id: id || "" },
          currentTarget: { value: opt.value, name: name || "", id: id || "" },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            aria-label={rest["aria-label"]}
            title={rest.title}
            onClick={(e) => {
              onClick?.(e as any);
            }}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-medium text-slate-900 shadow-2xs transition hover:border-slate-300 focus:outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150",
                open && "rotate-180 text-[#ff6900]"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          style={{
            width: "max-content",
            maxWidth: "min(92vw, 26rem)",
          }}
          className="p-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">No options available</div>
          ) : (
            <div className="space-y-0.5">
              {options.map((opt, idx) => {
                const isSelected = selectedOption
                  ? opt.value === selectedOption.value
                  : opt.value === currentValue;
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    disabled={opt.disabled}
                    onClick={(e) => handleSelectOption(opt, e)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl py-2 pl-3 pr-2.5 text-left text-xs font-semibold outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
                      isSelected
                        ? "bg-orange-50/80 text-[#ff6900] font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#ff6900] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);
SelectBox.displayName = "SelectBox";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectBox,
};
