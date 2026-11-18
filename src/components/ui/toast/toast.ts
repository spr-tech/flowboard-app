import { toast as sonnerToast } from "sonner";

export type ToastOptions = {
  type: "success" | "error" | "info";
  message: string;
  /**
   * Toasts with the same id replace each other instead of stacking. It defaults to type + message,
   * so a request that fails three times shows one error, not three.
   */
  id?: string;
};

/** Call from anywhere: toast({ type: "success", message: "Project created" }). */
export function toast({ type, message, id = `${type}:${message}` }: ToastOptions) {
  sonnerToast[type](message, { id });
}
