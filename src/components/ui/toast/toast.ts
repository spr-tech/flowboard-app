import { toast as sonnerToast } from "sonner";

export type ToastOptions = {
  type: "success" | "error" | "info";
  message: string;
  /**
   * Toasts with the same id replace each other instead of stacking. It defaults to type + message,
   * so a request that fails three times shows one error, not three.
   */
  id?: string;
  /** A button in the toast, such as Undo. Clicking it also closes the toast. */
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it closes by itself (default 4000, set on the Toaster). */
  duration?: number;
  /**
   * Called once when the toast goes away without its action being clicked: its time ran out, or it
   * was dismissed (swiped or closed). Not called after the action, so "commit unless undone" works.
   */
  onClose?: () => void;
};

/** Call from anywhere: toast({ type: "success", message: "Project created" }). */
export function toast({ type, message, id = `${type}:${message}`, action, duration, onClose }: ToastOptions) {
  let isSettled = false;
  const settle = (callback?: () => void) => () => {
    if (isSettled) return;
    isSettled = true;
    callback?.();
  };
  const close = settle(onClose);

  sonnerToast[type](message, {
    id,
    ...(duration === undefined ? {} : { duration }),
    ...(action ? { action: { label: action.label, onClick: settle(action.onClick) } } : {}),
    ...(onClose ? { onAutoClose: close, onDismiss: close } : {}),
  });
}

/** Closes a toast early (its onClose still runs). */
export function dismissToast(id: string) {
  sonnerToast.dismiss(id);
}
