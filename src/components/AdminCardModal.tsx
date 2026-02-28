import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AdminCardModal({
  open,
  title,
  maxWidthClass = "max-w-md",
  showCloseButton = true,
  topRightSlot,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  showCloseButton?: boolean;
  topRightSlot?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!open || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`flex h-fit max-h-[400px] w-[400px] ${maxWidthClass} flex-col rounded-xl border border-white/25 bg-[#5684EE] p-4 shadow-2xl backdrop-blur-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {topRightSlot}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/20 hover:text-white"
                title="close"
              >
                Close
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
