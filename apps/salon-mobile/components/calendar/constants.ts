export const BASE_YEAR = 2026;
export const BASE_MONTH_INDEX = 1;
export const WEEK_CENTER_INDEX = 1000;
export const WEEK_PAGE_COUNT = 2001;

// Shared prefetch buffer: month/week/list views all fetch data through the
// same monthDataRef cache (see loadMonth in index.tsx), so every view keeps
// this window of months warm around wherever the user currently is — not
// just the exact month(s) needed to render the current frame. This is what
// lets swiping a few weeks/months in either direction, or switching between
// month/week/list, land on already-loaded data instead of a fresh fetch.
export const PREFETCH_PAST_MONTHS = 1;
export const PREFETCH_FUTURE_MONTHS = 2;

// List view additionally flattens every loaded month into one scrollable
// list, so unlike month/week (which only ever render one page at a time) its
// loaded window has to grow as the user scrolls further, without ever
// evicting already-loaded months — evicting months behind the viewport is
// what caused the list to blank out on fast scroll. Growth is capped so a
// long session can't accumulate an unbounded number of months in memory.
export const LIST_MAX_LOADED_MONTHS = 14;
