import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { nl } from "date-fns/locale";

const { width } = Dimensions.get("window");

interface AirbnbCalendarProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange?: (month: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

const AirbnbCalendar: React.FC<AirbnbCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onMonthChange,
  minDate = new Date(),
  maxDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start week on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Get day names (Monday to Sunday)
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];

  const handlePreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only allow navigation if the new month contains today or future dates
    const monthEnd = endOfMonth(newMonth);
    if (monthEnd >= today) {
      setCurrentMonth(newMonth);
      onMonthChange?.(newMonth);
    }
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if previous month button should be disabled
  const isPreviousMonthDisabled = () => {
    const newMonth = subMonths(currentMonth, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthEnd = endOfMonth(newMonth);
    return monthEnd < today;
  };

  const renderDay = (date: Date) => {
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isTodayDate = isToday(date);
    const isDisabled = isDateDisabled(date) || isDateInPast(date);

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.dayContainer,
          isSelected && styles.selectedDay,
          isDisabled && styles.disabledDay,
        ]}
        onPress={() => !isDisabled && onDateSelect(date)}
        disabled={isDisabled}
      >
        <Text
          style={[
            styles.dayText,
            !isCurrentMonth && styles.otherMonthText,
            isSelected && styles.selectedDayText,
            isTodayDate && !isSelected && styles.todayText,
            isDisabled && styles.disabledDayText,
          ]}
        >
          {format(date, "d")}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          style={[
            styles.monthButton,
            isPreviousMonthDisabled() && styles.disabledButton,
          ]}
          onPress={handlePreviousMonth}
          disabled={isPreviousMonthDisabled()}
        >
          <Text
            style={[
              styles.monthButtonText,
              isPreviousMonthDisabled() && styles.disabledButtonText,
            ]}
          >
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.monthText}>
          {format(currentMonth, "MMMM yyyy", { locale: nl })}
        </Text>

        <TouchableOpacity style={styles.monthButton} onPress={handleNextMonth}>
          <Text style={styles.monthButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day Names Header */}
      <View style={styles.dayNamesContainer}>
        {dayNames.map((dayName, index) => (
          <View key={index} style={styles.dayNameContainer}>
            <Text style={styles.dayNameText}>{dayName}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => (
          <View key={date.toISOString()} style={styles.dayWrapper}>
            {renderDay(date)}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginVertical: 8,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  monthButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f7f7",
  },
  monthButtonText: {
    fontSize: 18,
    fontFamily: "mon-sb",
    color: "#222222",
  },
  monthText: {
    fontSize: 18,
    fontFamily: "mon-sb",
    color: "#222222",
  },
  dayNamesContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayNameContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontFamily: "mon",
    color: "#717171",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayWrapper: {
    width: `${100 / 7}%`, // Exactly 1/7th of the container width
    height: 40,
    marginVertical: 2,
  },
  dayContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDay: {
    backgroundColor: "#222222",
    borderRadius: 20,
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    fontFamily: "mon",
    color: "#222222",
  },
  otherMonthText: {
    color: "#717171",
  },
  selectedDayText: {
    color: "white",
    fontFamily: "mon-sb",
  },
  todayText: {
    color: "#222222",
    fontFamily: "mon-sb",
  },
  disabledDayText: {
    color: "#717171",
  },
  disabledButton: {
    opacity: 0.3,
  },
  disabledButtonText: {
    color: "#717171",
  },
});

export default AirbnbCalendar;
