import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface Coords {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  openUpward: boolean;
}

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  coords: Coords;
  updateCoords: () => void;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<Coords>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 180,
    openUpward: false,
  });

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const updateCoords = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 280 && rect.top > spaceBelow;
    setCoords({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      openUpward,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, updateCoords]);

  const contextValue = React.useMemo(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      coords,
      updateCoords,
    }),
    [open, setOpen, coords, updateCoords]
  );

  return (
    <PopoverContext.Provider value={contextValue}>
      {children}
    </PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ asChild, children, onClick, disabled, ...props }, forwardedRef) => {
    const ctx = React.useContext(PopoverContext);

    const setRefs = (node: HTMLElement | null) => {
      if (ctx) {
        ctx.triggerRef.current = node;
      }
      if (typeof forwardedRef === "function") {
        forwardedRef(node as HTMLButtonElement | null);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current =
          node as HTMLButtonElement | null;
      }
    };

    const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClick?.(e);
      if (disabled || !ctx) return;
      ctx.updateCoords();
      ctx.setOpen(!ctx.open);
    };

    if (asChild && React.isValidElement(children)) {
      const childProps = children.props as any;
      return React.cloneElement(children as React.ReactElement<any>, {
        ref: setRefs,
        disabled: disabled ?? childProps.disabled,
        "aria-expanded": ctx?.open ?? false,
        "data-state": ctx?.open ? "open" : "closed",
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          childProps.onClick?.(e);
          if (disabled || childProps.disabled || !ctx) return;
          ctx.updateCoords();
          ctx.setOpen(!ctx.open);
        },
      });
    }

    return (
      <button
        ref={setRefs}
        type="button"
        disabled={disabled}
        aria-expanded={ctx?.open ?? false}
        data-state={ctx?.open ? "open" : "closed"}
        onClick={handleTriggerClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverAnchor = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "start", sideOffset = 6, style, onClick, children, ...props }, forwardedRef) => {
    const ctx = React.useContext(PopoverContext);

    if (!ctx || !ctx.open || typeof document === "undefined") {
      return null;
    }

    const { coords } = ctx;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    let left = coords.left;
    if (align === "end") {
      left = Math.max(8, coords.right - Math.max(coords.width, 220));
    } else if (align === "center") {
      left = Math.max(8, coords.left + coords.width / 2 - 140);
    }
    // Keep within right screen edge
    if (left + 260 > viewportWidth) {
      left = Math.max(8, viewportWidth - 270);
    }

    const posStyle: React.CSSProperties = {
      position: "fixed",
      left: `${left}px`,
      minWidth: `${Math.max(coords.width, 140)}px`,
      zIndex: 99999,
      ...(coords.openUpward
        ? { bottom: `${Math.max(8, viewportHeight - coords.top + sideOffset)}px` }
        : { top: `${Math.max(8, coords.bottom + sideOffset)}px` }),
      ...style,
    };

    return createPortal(
      <div
        ref={(node) => {
          ctx.contentRef.current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        data-state="open"
        style={posStyle}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        className={cn(
          "z-[99999] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl outline-none overscroll-contain animate-in fade-in-0 zoom-in-95 duration-150",
          className
        )}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
PopoverContent.displayName = "PopoverContent";
