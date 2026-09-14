"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CalendarContextType {
  // Date management
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // Staff visibility management
  visibleStaff: string[];
  toggleStaffVisibility: (staffId: string) => void;
  isStaffVisible: (staffId: string | undefined) => boolean;
  isStaffSelected: (staffId: string | undefined) => boolean;
  initializeStaffSelection: (staffIds: string[]) => void;
  getSelectedStaffId: () => string | null;
}

const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error(
      "useCalendarContext must be used within a CalendarProvider"
    );
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Initialize with all staff visible by default - will be populated when staff data loads
  const [visibleStaff, setVisibleStaff] = useState<string[]>([]);

  const toggleStaffVisibility = useCallback((staffId: string) => {
    setVisibleStaff((prev) => {
      if (prev.includes(staffId)) {
        return prev.filter((id) => id !== staffId);
      }
      return [...prev, staffId];
    });
  }, []);

  const isStaffVisible = useCallback(
    (staffId: string | undefined) => {
      if (!staffId) return visibleStaff.length === 0;
      if (visibleStaff.length === 0) return false;
      return visibleStaff.includes(staffId);
    },
    [visibleStaff],
  );

  const isStaffSelected = useCallback(
    (staffId: string | undefined) => {
      if (!staffId) return false;
      return visibleStaff.includes(staffId);
    },
    [visibleStaff],
  );

  const initializeStaffSelection = useCallback((staffIds: string[]) => {
    setVisibleStaff(staffIds);
  }, []);

  const getSelectedStaffId = useCallback(() => {
    if (visibleStaff.length === 1) {
      return visibleStaff[0];
    }
    return null;
  }, [visibleStaff]);

  const value = useMemo(
    () => ({
      currentDate,
      setCurrentDate,
      visibleStaff,
      toggleStaffVisibility,
      isStaffVisible,
      isStaffSelected,
      initializeStaffSelection,
      getSelectedStaffId,
    }),
    [
      currentDate,
      visibleStaff,
      toggleStaffVisibility,
      isStaffVisible,
      isStaffSelected,
      initializeStaffSelection,
      getSelectedStaffId,
    ],
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
