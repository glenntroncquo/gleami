export const EventHeight = 24;

// Flip to true if a client asks to drag appointments to a new time.
// Persist already exists; this only gates the calendar drag UI.
export const ENABLE_APPOINTMENT_DRAG = false;

// Vertical gap between events in pixels - controls spacing in month view
export const EventGap = 4;

// Height of hour cells in week and day views - controls the scale of time display
// Increased to provide more space for short appointments (45min blocks now have ~72px height)
export const WeekCellsHeight = 86;

// Number of days to show in the agenda view
export const AgendaDaysToShow = 30;

// Start and end hours for the week and day views
export const StartHour = 7; // Start at 7 AM
export const EndHour = 20; // End at 8 PM

// Default start and end times
export const DefaultStartHour = 9; // 9 AM
export const DefaultEndHour = 10; // 10 AM
