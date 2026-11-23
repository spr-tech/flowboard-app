// The cache table from docs/plan/05-state.md, in one place. All times are in seconds.
//
// keepUnusedDataFor: how long data stays cached after the last component using it unmounts.
//   Leave a board and come back within 120 s, and it shows instantly from the cache.
// refetchOnMountOrArgChange: when a component mounts and the cached data is older than this,
//   refetch in the background (the cached data shows meanwhile). false = never on mount.
// refetchOnFocus: refetch when the tab regains focus (API-wide default: on).
//
// RTK Query accepts keepUnusedDataFor per endpoint, but the refetch options only API-wide or per
// subscription (the options given to a use…Query hook). So each entry has two parts:
// `endpoint` goes on the endpoint definition, `subscription` into the service's hook.
type CacheSetting = {
  endpoint: { keepUnusedDataFor: number };
  subscription: { refetchOnMountOrArgChange: boolean | number; refetchOnFocus?: boolean };
};

export const CACHE = {
  board: { endpoint: { keepUnusedDataFor: 120 }, subscription: { refetchOnMountOrArgChange: 30 } },
  dashboard: { endpoint: { keepUnusedDataFor: 120 }, subscription: { refetchOnMountOrArgChange: 30 } },
  activity: { endpoint: { keepUnusedDataFor: 120 }, subscription: { refetchOnMountOrArgChange: 30 } },
  projects: { endpoint: { keepUnusedDataFor: 300 }, subscription: { refetchOnMountOrArgChange: 60 } },
  members: { endpoint: { keepUnusedDataFor: 300 }, subscription: { refetchOnMountOrArgChange: 60 } },
  // Your own name doesn't change because you switched tabs, so Me skips the focus refetch too.
  me: {
    endpoint: { keepUnusedDataFor: 600 },
    subscription: { refetchOnMountOrArgChange: false, refetchOnFocus: false },
  },
} satisfies Record<string, CacheSetting>;

/** Activity also polls, but only while the tab is visible. */
export const ACTIVITY_POLLING = { pollingInterval: 30_000, skipPollingIfUnfocused: true } as const;
