import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable]';

function queryFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((node) => !node.hasAttribute("disabled"));
}

export function useFocusTrap(
  open: boolean,
  onClose?: () => void,
  restoreFocus = true,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    previousFocusRef.current = previouslyFocused;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    const timer = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const focusables = queryFocusables(containerRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        containerRef.current.setAttribute("tabindex", "-1");
        containerRef.current.focus();
      }
    });

    return () => {
      cancelAnimationFrame(timer);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, restoreFocus]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) return;

      const focusables = queryFocusables(containerRef.current);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return containerRef;
}
