import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { defaultStyles } from "@/constants/Styles";
import AirbnbCalendar from "./AirbnbCalendar";
import { useAvailabilities } from "@/hooks/useAvailabilities";
import { TimeSlot } from "@/types/availability";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/app/_layout";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";

interface SelectedService {
  serviceId: string;
  serviceName: string;
  optionId: string;
  optionName: string;
  price: number;
  duration: string;
}

interface BookingBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedServices: SelectedService[];
  salonName: string;
  salonAddress: string;
  companyId: string;
  companyImages?: string[];
  onBookingComplete?: (bookingData: any) => void;
}

const BookingBottomSheet: React.FC<BookingBottomSheetProps> = ({
  isVisible,
  onClose,
  selectedServices,
  salonName,
  salonAddress,
  companyId,
  companyImages = [],
  onBookingComplete,
}) => {
  // Authentication
  const { session } = useAuth();

  // State management
  const [step, setStep] = useState(1); // 1 = date selection, 2 = guest info (if not logged in), 3 = confirmation
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Guest information state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Translation hook
  const { t } = useTranslation();

  // Availability hook
  const {
    availabilities,
    loading: loadingAvailabilities,
    error: availabilityError,
    fetchAvailabilities,
    getTimeSlotsForDate,
  } = useAvailabilities();

  // Reset state when modal opens
  React.useEffect(() => {
    if (isVisible) {
      setStep(1);
      setSelectedDate("");
      setSelectedTime("");
      setCurrentMonth(new Date());
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setIsBooking(false);

      // Fetch availabilities for current month
      const treatments = selectedServices.map((service) => ({
        treatmentId: service.serviceId,
        priceOptionId: service.optionId,
      }));
      fetchAvailabilities(companyId, treatments, new Date());
    }
  }, [isVisible, companyId, selectedServices, fetchAvailabilities]);

  // Fetch availabilities when month changes
  React.useEffect(() => {
    if (isVisible) {
      const treatments = selectedServices.map((service) => ({
        treatmentId: service.serviceId,
        priceOptionId: service.optionId,
      }));
      fetchAvailabilities(companyId, treatments, currentMonth);
    }
  }, [
    currentMonth,
    isVisible,
    companyId,
    selectedServices,
    fetchAvailabilities,
  ]);

  // Calculate total price and duration
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0
  );

  const totalDuration = selectedServices.reduce((sum, service) => {
    const minutes = parseInt(service.duration.match(/\d+/)?.[0] || "0");
    return sum + minutes;
  }, 0);

  const handleDateSelect = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    setSelectedDate(dateString);
    setSelectedTime(""); // Reset time when date changes
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleContinue = () => {
    if (step === 1 && selectedDate && selectedTime) {
      // If user is not logged in, go to guest info step
      if (!session) {
        setStep(2);
      } else {
        // If user is logged in, go directly to confirmation
        setStep(3);
      }
    } else if (step === 2 && firstName && lastName && email && phone) {
      // Guest info step - go to confirmation
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      // From confirmation, go back to guest info or date selection
      if (!session) {
        setStep(2);
      } else {
        setStep(1);
      }
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleConfirmBooking = async () => {
    if (isBooking) return;

    setIsBooking(true);

    try {
      // Calculate start and end times in local time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + totalDuration);

      // Create ISO strings with exact time selected (no timezone conversion)
      const formatExactTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
      };

      // Prepare treatments data
      const treatments = selectedServices.map((service) => ({
        treatmentId: service.serviceId,
        priceOptionId: service.optionId,
      }));

      // Get staff ID from selected time slot
      const timeSlots = getTimeSlotsForDate(selectedDate);
      const selectedSlot = timeSlots.find((slot) => slot.time === selectedTime);

      console.log("start time", formatExactTime(startTime));
      console.log("selected time", selectedTime);

      // Call the booking function
      const response = await supabase.functions.invoke("book-appointment-v3", {
        body: {
          client_id: session?.user?.id || null,
          start: formatExactTime(startTime),
          end: formatExactTime(endTime),
          staff_id: selectedSlot?.staffId || "",
          company_id: companyId,
          treatments,
          price: totalPrice,
          duration: totalDuration,
          firstName: session?.user?.user_metadata?.first_name || firstName,
          lastName: session?.user?.user_metadata?.last_name || lastName,
          email: session?.user?.email || email,
          phone: session?.user?.user_metadata?.phone || phone,
          notes: "",
          imageData: null,
        },
      });

      if (response.error) {
        throw response.error;
      }

      // Success
      Alert.alert("Boeking bevestigd!", "Je afspraak is succesvol geboekt.", [
        {
          text: "OK",
          onPress: () => {
            onBookingComplete?.(response.data);
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error("Booking error:", error);
      Alert.alert(
        "Fout",
        "Er is een fout opgetreden bij het boeken. Probeer het opnieuw.",
        [{ text: "OK" }]
      );
    } finally {
      setIsBooking(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get minimum date (today)
  const minDate = new Date();

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <View style={styles.header}>
          {(step === 2 || step === 3) && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color={Colors.dark} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {step === 1
              ? t("selectDateAndTime")
              : step === 2
              ? "Contactgegevens"
              : t("confirmBooking")}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Step 1: Date and Time Selection */}
        {step === 1 && (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Calendar */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("chooseDate")}</Text>
              <AirbnbCalendar
                selectedDate={selectedDate ? new Date(selectedDate) : undefined}
                onDateSelect={handleDateSelect}
                minDate={new Date(minDate)}
                onMonthChange={handleMonthChange}
              />
            </View>

            {/* Time Slots */}
            {selectedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("availableTimes")}</Text>
                {loadingAvailabilities ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                  </View>
                ) : availabilityError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {t("failedToLoadTimes")}
                    </Text>
                    <Text style={styles.errorSubtext}>{availabilityError}</Text>
                  </View>
                ) : (
                  <View style={styles.timeGrid}>
                    {getTimeSlotsForDate(selectedDate).map((slot) => (
                      <TouchableOpacity
                        key={slot.time}
                        style={[
                          styles.timeSlot,
                          !slot.available && styles.timeSlotDisabled,
                          selectedTime === slot.time && styles.timeSlotSelected,
                        ]}
                        onPress={() =>
                          slot.available && handleTimeSelect(slot.time)
                        }
                        disabled={!slot.available}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            !slot.available && styles.timeSlotTextDisabled,
                            selectedTime === slot.time &&
                              styles.timeSlotTextSelected,
                          ]}
                        >
                          {slot.time}
                        </Text>
                        {slot.staffName && (
                          <Text style={styles.staffNameText}>
                            {slot.staffName}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Step 2: Guest Information (only if not logged in) */}
        {step === 2 && !session && (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.guestInfoSection}>
              <Text style={styles.guestInfoTitle}>Contactgegevens</Text>
              <Text style={styles.guestInfoSubtitle}>
                Vul je gegevens in om de boeking te voltooien
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Voornaam *</Text>
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Je voornaam"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Achternaam *</Text>
                <TextInput
                  style={styles.textInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Je achternaam"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-mailadres *</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="je@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefoonnummer *</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="06 12345678"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </ScrollView>
        )}

        {/* Step 3: Confirmation - Airbnb Style */}
        {step === 3 && (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Property Card - Exact Airbnb Match */}
            <View style={styles.airbnbPropertyCard}>
              <View style={styles.airbnbImageContainer}>
                {companyImages.length > 0 ? (
                  <Image
                    source={{ uri: companyImages[0] }}
                    style={styles.airbnbPropertyImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.airbnbImagePlaceholder}>
                    <Ionicons name="business" size={40} color="#999" />
                  </View>
                )}
                <View style={styles.airbnbRatingBadge}>
                  <Ionicons name="star" size={12} color="white" />
                  <Text style={styles.airbnbRatingText}>4,99 (167)</Text>
                </View>
              </View>
              <View style={styles.airbnbPropertyInfo}>
                <Text style={styles.airbnbPropertyTitle}>{salonName}</Text>
                <View style={styles.airbnbRatingRow}>
                  <Ionicons name="star" size={12} color="black" />
                  <Text style={styles.airbnbRatingTextBlack}>4,99 (167)</Text>
                </View>
              </View>
            </View>

            {/* Booking Details - Exact Airbnb Match */}
            <View style={styles.airbnbBookingDetails}>
              <View style={styles.airbnbDetailRow}>
                <Text style={styles.airbnbDetailLabel}>Datums</Text>
                <View style={styles.airbnbDetailValueContainer}>
                  <Text style={styles.airbnbDetailValue}>
                    {formatDate(selectedDate)}
                  </Text>
                  <TouchableOpacity style={styles.airbnbChangeButton}>
                    <Text style={styles.airbnbChangeText}>Wijzigen</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.airbnbDetailRow}>
                <Text style={styles.airbnbDetailLabel}>Gasten</Text>
                <View style={styles.airbnbDetailValueContainer}>
                  <Text style={styles.airbnbDetailValue}>
                    {selectedServices.length} dienst
                    {selectedServices.length !== 1 ? "en" : ""}
                  </Text>
                  <TouchableOpacity style={styles.airbnbChangeButton}>
                    <Text style={styles.airbnbChangeText}>Wijzigen</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.airbnbDetailRow}>
                <Text style={styles.airbnbDetailLabel}>Totaalprijs</Text>
                <View style={styles.airbnbDetailValueContainer}>
                  <Text style={styles.airbnbTotalPrice}>
                    € {totalPrice.toFixed(2)} EUR
                  </Text>
                  <TouchableOpacity style={styles.airbnbInfoButton}>
                    <Text style={styles.airbnbInfoText}>Meer informatie</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Cancellation Policy - Exact Airbnb Match */}
            <View style={styles.airbnbCancellationSection}>
              <Text style={styles.airbnbCancellationTitle}>
                Gratis annuleren
              </Text>
              <Text style={styles.airbnbCancellationText}>
                Annuleer vóór {formatDate(selectedDate)} voor een volledige
                terugbetaling.{" "}
                <Text style={styles.airbnbUnderlinedText}>
                  Volledige voorwaarden
                </Text>
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {step === 1 ? (
            <TouchableOpacity
              style={[
                defaultStyles.btn,
                (!selectedDate || !selectedTime) && styles.btnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!selectedDate || !selectedTime}
            >
              <Text style={defaultStyles.btnText}>{t("continue")}</Text>
            </TouchableOpacity>
          ) : step === 2 ? (
            <TouchableOpacity
              style={[
                defaultStyles.btn,
                (!firstName || !lastName || !email || !phone) &&
                  styles.btnDisabled,
              ]}
              onPress={handleContinue}
              disabled={!firstName || !lastName || !email || !phone}
            >
              <Text style={defaultStyles.btnText}>Doorgaan</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerContent}>
              <View>
                <Text style={styles.footerPrice}>€{totalPrice}</Text>
                <Text style={styles.footerSubtext}>
                  {formatDate(selectedDate)} at {selectedTime}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  defaultStyles.btn,
                  styles.confirmBtn,
                  isBooking && styles.btnDisabled,
                ]}
                onPress={handleConfirmBooking}
                disabled={isBooking}
              >
                <Text style={defaultStyles.btnText}>
                  {isBooking
                    ? "Bezig met boeken..."
                    : t("confirmBookingButton")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backButton: {
    position: "absolute",
    left: 20,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "mon-sb",
    color: Colors.dark,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "white",
  },
  timeSlotDisabled: {
    backgroundColor: Colors.lightGrey,
    borderColor: Colors.border,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  timeSlotTextDisabled: {
    color: Colors.grey,
  },
  timeSlotTextSelected: {
    color: "white",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGrey,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "mon",
    color: Colors.grey,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: Colors.dark,
    marginBottom: 2,
  },
  detailSubtext: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
  },
  confirmServiceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  confirmServiceInfo: {
    flex: 1,
  },
  confirmServiceName: {
    fontSize: 15,
    fontFamily: "mon-sb",
    color: Colors.dark,
    marginBottom: 4,
  },
  confirmServiceOption: {
    fontSize: 13,
    fontFamily: "mon",
    color: Colors.grey,
  },
  confirmServicePrice: {
    fontSize: 15,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 15,
    fontFamily: "mon",
    color: Colors.dark,
  },
  priceValue: {
    fontSize: 15,
    fontFamily: "mon",
    color: Colors.dark,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  totalPrice: {
    fontSize: 20,
    fontFamily: "mon-b",
    color: Colors.dark,
  },
  policyText: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: "white",
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  footerPrice: {
    fontSize: 20,
    fontFamily: "mon-b",
    color: Colors.dark,
  },
  footerSubtext: {
    fontSize: 13,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 2,
  },
  confirmBtn: {
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#ef4444",
    marginTop: 12,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 4,
    textAlign: "center",
  },
  staffNameText: {
    fontSize: 10,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 2,
  },
  // Airbnb-style exact match styles
  airbnbPropertyCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
  },
  airbnbImageContainer: {
    height: 200,
    position: "relative",
  },
  airbnbPropertyImage: {
    width: "100%",
    height: "100%",
  },
  airbnbImagePlaceholder: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  airbnbRatingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  airbnbRatingText: {
    color: "white",
    fontSize: 12,
    fontFamily: "mon-sb",
    marginLeft: 4,
  },
  airbnbPropertyInfo: {
    padding: 16,
  },
  airbnbPropertyTitle: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
    marginBottom: 8,
    lineHeight: 20,
  },
  airbnbRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  airbnbRatingTextBlack: {
    fontSize: 14,
    fontFamily: "mon-sb",
    color: "#000",
  },
  // Booking details section
  airbnbBookingDetails: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  airbnbDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  airbnbDetailLabel: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
  },
  airbnbDetailValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  airbnbDetailValue: {
    fontSize: 16,
    fontFamily: "mon",
    color: "#000",
  },
  airbnbTotalPrice: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
    textDecorationLine: "underline",
  },
  airbnbChangeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  airbnbChangeText: {
    fontSize: 16,
    fontFamily: "mon",
    color: "#000",
    textDecorationLine: "underline",
  },
  airbnbInfoButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  airbnbInfoText: {
    fontSize: 16,
    fontFamily: "mon",
    color: "#000",
    textDecorationLine: "underline",
  },
  // Cancellation section
  airbnbCancellationSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  airbnbCancellationTitle: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
    marginBottom: 8,
  },
  airbnbCancellationText: {
    fontSize: 14,
    fontFamily: "mon",
    color: "#666",
    lineHeight: 20,
  },
  airbnbUnderlinedText: {
    textDecorationLine: "underline",
  },
  // Payment section
  airbnbPaymentSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  airbnbPaymentTitle: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
    marginBottom: 16,
  },
  airbnbPaymentOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  airbnbRadioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  airbnbRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000",
  },
  airbnbRadioUnselected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  airbnbPaymentOptionContent: {
    flex: 1,
  },
  airbnbPaymentOptionTitle: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
    marginBottom: 4,
  },
  airbnbPaymentOptionSubtext: {
    fontSize: 14,
    fontFamily: "mon",
    color: "#666",
    lineHeight: 18,
  },
  // Guest information form styles
  guestInfoSection: {
    padding: 20,
  },
  guestInfoTitle: {
    fontSize: 24,
    fontFamily: "mon-b",
    color: "#000",
    marginBottom: 8,
  },
  guestInfoSubtitle: {
    fontSize: 16,
    fontFamily: "mon",
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#000",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "mon",
    color: "#000",
    backgroundColor: "#fff",
  },
});

export default BookingBottomSheet;
