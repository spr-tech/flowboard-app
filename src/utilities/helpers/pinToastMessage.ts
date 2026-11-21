import { SIDEBAR_PROJECT_LIMIT } from "./projectOrder";

/**
 * The toast after a pin or unpin (docs/designs/app-screens.md). `pinNumber` is this pin's place
 * in my pin order (1 = my oldest pin): only the first 3 reach the sidebar.
 */
export function pinToastMessage(name: string, action: { pinned: true; pinNumber: number } | { pinned: false }) {
  if (!action.pinned) return `${name} unpinned`;
  return action.pinNumber <= SIDEBAR_PROJECT_LIMIT
    ? `${name} pinned to your sidebar`
    : `${name} pinned (only your first ${SIDEBAR_PROJECT_LIMIT} pins show in the sidebar)`;
}
