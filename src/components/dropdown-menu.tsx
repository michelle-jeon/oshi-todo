"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type DropdownMenuProps = {
  button: ReactNode;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  ariaLabel: string;
};

export function DropdownMenu({
  button,
  children,
  className,
  panelClassName,
  ariaLabel
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className={className} ref={menuRef}>
      <button
        className="menu-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {button}
      </button>
      {isOpen ? <div className={panelClassName}>{children}</div> : null}
    </div>
  );
}
