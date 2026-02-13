"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "loading";

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastOptions = {
  tone: ToastTone;
  message: string;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone, message, durationMs }: ToastOptions) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, tone, message }]);

      const ms = durationMs ?? (tone === "loading" ? 0 : 2400);
      if (ms > 0) {
        window.setTimeout(() => dismissToast(id), ms);
      }
      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone}`} role="status">
            {toast.tone === "loading" ? <span className="toast-spinner" aria-hidden="true" /> : null}
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => dismissToast(toast.id)} type="button" aria-label="Close toast">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
