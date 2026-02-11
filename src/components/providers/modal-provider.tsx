"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import Portal from "@/components/ui/portal";

type ConfirmationType = "confirm" | "alert";

type ConfirmationOptions = {
  title: string;
  message: ReactNode;
  type?: ConfirmationType;
  action?: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmationContextType = {
  showConfirmation: (options: ConfirmationOptions) => void;
  closeConfirmation: () => void;
};

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(
  undefined,
);

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within a ModalProvider");
  }
  return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: ConfirmationType;
    title: string;
    message: ReactNode;
    action: () => Promise<void> | void;
    confirmLabel: string;
    cancelLabel: string;
  }>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
    action: () => { },
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalId, setModalId] = useState(0);

  const showConfirmation = ({
    title,
    message,
    type = "confirm",
    action,
    confirmLabel,
    cancelLabel,
  }: ConfirmationOptions) => {
    setModalId((prev) => prev + 1);
    setConfirmation({
      isOpen: true,
      title,
      message,
      type,
      action: action || (() => { }),
      confirmLabel: confirmLabel || (type === "alert" ? "OK" : "Confirm"),
      cancelLabel: cancelLabel || "Cancel",
    });
    setIsSubmitting(false);
  };

  const closeConfirmation = () => {
    if (isSubmitting) return;
    setConfirmation((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = async () => {
    if (confirmation.action) {
      const currentId = modalId;
      setIsSubmitting(true);
      try {
        await confirmation.action();
      } finally {
        setIsSubmitting(false);
        // Only close if we are still on the same modal that started the action
        setModalId((latestId) => {
          if (latestId === currentId) {
            setConfirmation((prev) => ({ ...prev, isOpen: false }));
          }
          return latestId;
        });
      }
    } else {
      setConfirmation((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <ConfirmationContext.Provider
      value={{ showConfirmation, closeConfirmation }}
    >
      {children}

      {/* Global Modal Overlay */}
      {confirmation.isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div
                className={`flex items-center gap-3 mb-4 ${confirmation.type === "alert" ? "text-blue-500" : "text-destructive"}`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
                <h3 className="text-lg font-bold text-foreground">
                  {confirmation.title}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                {confirmation.message}
              </p>
              <div className="flex justify-end gap-3">
                {confirmation.type === "confirm" && (
                  <button
                    onClick={closeConfirmation}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                  >
                    {confirmation.cancelLabel}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 ${confirmation.type === "alert" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"} rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-70`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Memproses..." : confirmation.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </ConfirmationContext.Provider>
  );
}
