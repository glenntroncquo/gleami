import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { 
  addCompany, 
  addStaff, 
  addTreatment, 
  addPriceOption, 
  addAvailability, 
  addStaffTreatment, 
  bookAppointment, 
  updateCompanySettings, 
  getAvailabilitiesByInterval,
  cleanDatabase 
} from "../steps/helpers";
import { addHours, addDays, startOfMonth, endOfMonth, format } from 'date-fns'


// v1 availability-list integration coverage — still matches main (old tables).
describe("Get Availabilities By Interval - Duration Logic Tests", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterEach(async () => {
    // await cleanDatabase();
  });

  describe("Duration and Actual Duration Scenarios - No Existing Appointments", () => {
    it("Scenario 1: duration=60, actual_duration=60, interval=60 should produce slots 8-9, 9-10, 10-11, 11-12", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Hair Cut",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Standard Cut",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 50.00,
        duration_in_minutes: 60,
        actual_duration_in_minutes: 60
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);
      

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(4);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots[0].start_time).toBe('08:00');
      expect(slots[0].end_time).toBe('09:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      expect(slots[1].start_time).toBe('09:00');
      expect(slots[1].end_time).toBe('10:00');
      expect(slots[2].start_time).toBe('10:00');
      expect(slots[2].end_time).toBe('11:00');
      expect(slots[3].start_time).toBe('11:00');
      expect(slots[3].end_time).toBe('12:00');
    });

    it("Scenario 2: duration=120, actual_duration=60, interval=60 should produce slots 8-10, 9-11, 10-12", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Hair Cut & Color",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Long Treatment",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 100.00,
        duration_in_minutes: 120, // Client experiences 2 hours
        actual_duration_in_minutes: 60 // Staff only blocked for 1 hour
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(3);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots[0].start_time).toBe('08:00');
      expect(slots[0].end_time).toBe('10:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      expect(slots[1].start_time).toBe('09:00');
      expect(slots[1].end_time).toBe('11:00');
      expect(slots[2].start_time).toBe('10:00');
      expect(slots[2].end_time).toBe('12:00');
      // No 11-12 slot because client treatment (120min) wouldn't fit
    });

    it("Scenario 3: duration=60, actual_duration=120, interval=60 should produce slots 8-9, 9-10, 10-11", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Complex Treatment",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Staff Intensive",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 75.00,
        duration_in_minutes: 60, // Client only there for 1 hour
        actual_duration_in_minutes: 120 // Staff blocked for 2 hours (cleanup, etc.)
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(3);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots[0].start_time).toBe('08:00');
      expect(slots[0].end_time).toBe('09:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      expect(slots[1].start_time).toBe('09:00');
      expect(slots[1].end_time).toBe('10:00');
      expect(slots[2].start_time).toBe('10:00');
      expect(slots[2].end_time).toBe('11:00');
      // No 11-12 slot because staff would be blocked until 13:00 (beyond availability)
    });
  });

  describe("Duration and Actual Duration Scenarios - With Existing Appointment at 8:00", () => {
    it("Scenario 1 with appointment: duration=60, actual_duration=60 should produce slots 9-10, 10-11, 11-12", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Hair Cut",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Standard Cut",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 50.00,
        duration_in_minutes: 60,
        actual_duration_in_minutes: 60
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Book existing appointment at 8:00
      const appointmentStart = new Date(testDate);
      appointmentStart.setHours(8, 0, 0, 0);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setHours(9, 0, 0, 0);

      await bookAppointment({
        start: formatDateForDB(appointmentStart),
        end: formatDateForDB(appointmentEnd),
        staffId: staff.id,
        companyId: company.id,
        treatmentId: treatment.id,
        priceOptionId: priceOption.id,
        price: 50.00,
        firstName: "Jane",
        lastName: "Smith",
        email: `jane.smith.${Date.now()}.${Math.random()}@test.com`
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(3);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots[0].start_time).toBe('09:00');
      expect(slots[0].end_time).toBe('10:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      expect(slots[1].start_time).toBe('10:00');
      expect(slots[1].end_time).toBe('11:00');
      expect(slots[2].start_time).toBe('11:00');
      expect(slots[2].end_time).toBe('12:00');
    });

    it("Scenario 2 with appointment: duration=120, actual_duration=60 should produce slots 9-10, 10-11", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Hair Cut & Color",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Long Treatment",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 100.00,
        duration_in_minutes: 120, // Client experiences 2 hours
        actual_duration_in_minutes: 60 // Staff only blocked for 1 hour
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Book existing appointment at 8:00
      const appointmentStart = new Date(testDate);
      appointmentStart.setHours(8, 0, 0, 0);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setHours(9, 0, 0, 0);

      await bookAppointment({
        start: formatDateForDB(appointmentStart),
        end: formatDateForDB(appointmentEnd),
        staffId: staff.id,
        companyId: company.id,
        treatmentId: treatment.id,
        priceOptionId: priceOption.id,
        price: 50.00,
        firstName: "Jane",
        lastName: "Smith",
        email: `jane.smith.${Date.now()}.${Math.random()}@test.com`
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(2);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots[0].start_time).toBe('09:00');
      expect(slots[0].end_time).toBe('11:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      expect(slots[1].start_time).toBe('10:00');
      expect(slots[1].end_time).toBe('12:00');
      // No 11-12 slot because client treatment (120min) wouldn't fit
    });

    it("Scenario 3 with appointment: duration=60, actual_duration=120 should produce slot 10-11", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Complex Treatment",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Staff Intensive",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 75.00,
        duration_in_minutes: 60, // Client only there for 1 hour
        actual_duration_in_minutes: 120 // Staff blocked for 2 hours (cleanup, etc.)
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Book existing appointment at 8:00 (staff blocked until 10:00 due to actual_duration=120)
      const appointmentStart = new Date(testDate);
      appointmentStart.setHours(8, 0, 0, 0);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setHours(9, 0, 0, 0);

      await bookAppointment({
        start: formatDateForDB(appointmentStart),
        end: formatDateForDB(appointmentEnd),
        staffId: staff.id,
        companyId: company.id,
        treatmentId: treatment.id,
        priceOptionId: priceOption.id,
        price: 75.00,
        firstName: "Jane",
        lastName: "Smith",
        email: `jane.smith.${Date.now()}.${Math.random()}@test.com`
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(1);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots[0].start_time).toBe('10:00');
      expect(slots[0].end_time).toBe('11:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      // No 8-9 or 9-10 slots because staff blocked until 10:00 due to existing appointment's actual_duration=120
      // No 11-12 slot because new treatment would block staff until 13:00 (beyond 12:00 availability)
    });
  });

  describe("Multiple Treatments Scenarios", () => {
    it("Two treatments with different durations: treatment1=60min, treatment2=90min should use max interval and sum durations", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      // First treatment: 60 minutes
      const treatment1 = await addTreatment({
        name: "Hair Cut",
        company_id: company.id
      });

      const priceOption1 = await addPriceOption({
        name: "Standard Cut",
        treatment_id: treatment1.id,
        company_id: company.id,
        price: 50.00,
        duration_in_minutes: 60,
        actual_duration_in_minutes: 60
      });

      // Second treatment: 90 minutes
      const treatment2 = await addTreatment({
        name: "Hair Color",
        company_id: company.id
      });

      const priceOption2 = await addPriceOption({
        name: "Color Treatment",
        treatment_id: treatment2.id,
        company_id: company.id,
        price: 80.00,
        duration_in_minutes: 90,
        actual_duration_in_minutes: 90
      });

      await addStaffTreatment(staff.id, treatment1.id, company.id);
      await addStaffTreatment(staff.id, treatment2.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Act - Request both treatments
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [
          { treatmentId: treatment1.id, priceOptionId: priceOption1.id },
          { treatmentId: treatment2.id, priceOptionId: priceOption2.id }
        ],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      
      // Should have slots based on combined duration (60+90=150 minutes) and max interval
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots.length).toBeGreaterThan(0);
      
      // Each slot should be 150 minutes (2.5 hours) for the combined treatment
      const firstSlot = slots[0];
      const slotStart = new Date(firstSlot.available_start);
      const slotEnd = new Date(firstSlot.available_end);
      const slotDurationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
      expect(slotDurationMinutes).toBe(150); // 60 + 90 minutes
    });

    it("Three treatments with different intervals: should use the biggest interval for slot generation", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      // Treatment 1: 30-minute interval
      const treatment1 = await addTreatment({
        name: "Quick Service",
        company_id: company.id
      });

      const priceOption1 = await addPriceOption({
        name: "Quick Option",
        treatment_id: treatment1.id,
        company_id: company.id,
        price: 25.00,
        duration_in_minutes: 30,
        actual_duration_in_minutes: 30
      });

      // Treatment 2: 60-minute interval
      const treatment2 = await addTreatment({
        name: "Standard Service",
        company_id: company.id
      });

      const priceOption2 = await addPriceOption({
        name: "Standard Option",
        treatment_id: treatment2.id,
        company_id: company.id,
        price: 50.00,
        duration_in_minutes: 60,
        actual_duration_in_minutes: 60
      });

      // Treatment 3: 90-minute interval (biggest)
      const treatment3 = await addTreatment({
        name: "Premium Service",
        company_id: company.id
      });

      const priceOption3 = await addPriceOption({
        name: "Premium Option",
        treatment_id: treatment3.id,
        company_id: company.id,
        price: 100.00,
        duration_in_minutes: 90,
        actual_duration_in_minutes: 90
      });

      await addStaffTreatment(staff.id, treatment1.id, company.id);
      await addStaffTreatment(staff.id, treatment2.id, company.id);
      await addStaffTreatment(staff.id, treatment3.id, company.id);

      const testDate = addDays(new Date(), 1);

      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(8, 0, 0, 0);

      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(12, 0, 0, 0);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Act - Request all three treatments
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [
          { treatmentId: treatment1.id, priceOptionId: priceOption1.id },
          { treatmentId: treatment2.id, priceOptionId: priceOption2.id },
          { treatmentId: treatment3.id, priceOptionId: priceOption3.id }
        ],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      
      // Should have slots based on combined duration (30+60+90=180 minutes) and max interval (90 minutes)
      const slots = result.dates[dateKey].staff[staff.id].slots;
      expect(slots.length).toBeGreaterThan(0);
      
      // Each slot should be 180 minutes (3 hours) for the combined treatment
      const firstSlot = slots[0];
      const slotStart = new Date(firstSlot.available_start);
      const slotEnd = new Date(firstSlot.available_end);
      const slotDurationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
      expect(slotDurationMinutes).toBe(180); // 30 + 60 + 90 minutes
    });
  });

  describe("Split Availability Scenarios", () => {
    it("Split availabilities: 8:00-10:00 and 10:00-12:00 with duration=120, actual_duration=60 should produce slots 8-9 and 10-11", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Hair Cut & Color",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Long Treatment",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 100.00,
        duration_in_minutes: 120, // Client experiences 2 hours
        actual_duration_in_minutes: 60 // Staff only blocked for 1 hour
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // First availability: 8:00-10:00
      const availability1Start = new Date(testDate);
      availability1Start.setHours(8, 0, 0, 0);
      const availability1End = new Date(testDate);
      availability1End.setHours(10, 0, 0, 0);

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availability1Start),
        end: formatDateForDB(availability1End),
        recurring: false
      });

      // Second availability: 10:00-12:00
      const availability2Start = new Date(testDate);
      availability2Start.setHours(10, 0, 0, 0);
      const availability2End = new Date(testDate);
      availability2End.setHours(12, 0, 0, 0);

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availability2Start),
        end: formatDateForDB(availability2End),
        recurring: false
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availability1Start, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(2);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      
      // First slot from first availability: 8:00-9:00
      expect(slots[0].start_time).toBe('08:00');
      expect(slots[0].end_time).toBe('10:00');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      
      // Second slot from second availability: 10:00-11:00
      expect(slots[1].start_time).toBe('10:00');
      expect(slots[1].end_time).toBe('12:00');
      expect(slots[1].first_name).toBe('John');
      expect(slots[1].last_name).toBe('Doe');
      expect(slots[1].image_path).toBe(null);
      
      // No 9:00-10:00 slot because it would overlap with client from 8:00 appointment (8:00-10:00)
      // No 11:00-12:00 slot because it would overlap with client from 10:00 appointment (10:00-12:00)
    });

    it("Short availability window: 13:30-15:30 with duration=120, actual_duration=60 should produce 1 slot at 13:30-14:30", async () => {
      // Arrange
      const company = await addCompany({ name: "Test Salon" });
      await updateCompanySettings(company.id, { interval_duration: 60 });

      const staff = await addStaff({
        first_name: "John",
        last_name: "Doe",
        email: `john.doe.${Date.now()}.${Math.random()}@testsalon.com`,
        company_id: company.id
      });

      const treatment = await addTreatment({
        name: "Hair Cut & Color",
        company_id: company.id
      });

      const priceOption = await addPriceOption({
        name: "Long Treatment",
        treatment_id: treatment.id,
        company_id: company.id,
        price: 100.00,
        duration_in_minutes: 120, // Client experiences 2 hours
        actual_duration_in_minutes: 60 // Staff only blocked for 1 hour
      });

      await addStaffTreatment(staff.id, treatment.id, company.id);

      const testDate = addDays(new Date(), 1);

      // Format dates without timezone conversion to preserve exact times
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      // Short availability window: 13:30-15:30 (only 2 hours)
      const availabilityStart = new Date(testDate);
      availabilityStart.setHours(13, 30, 0, 0);
      const availabilityEnd = new Date(testDate);
      availabilityEnd.setHours(15, 30, 0, 0);

      await addAvailability({
        staff_id: staff.id,
        company_id: company.id,
        start: formatDateForDB(availabilityStart),
        end: formatDateForDB(availabilityEnd),
        recurring: false
      });

      // Act
      const result = await getAvailabilitiesByInterval({
        companyId: company.id,
        treatments: [{ treatmentId: treatment.id, priceOptionId: priceOption.id }],
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString()
      });

      // Assert
      const dateKey = format(availabilityStart, 'yyyy-MM-dd');
      expect(result.dates).toBeDefined();
      expect(result.dates[dateKey]).toBeDefined();
      expect(result.dates[dateKey].staff).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id]).toBeDefined();
      expect(result.dates[dateKey].staff[staff.id].slots).toHaveLength(1);
      
      const slots = result.dates[dateKey].staff[staff.id].slots;
      
      // Only one slot: 13:30-14:30
      expect(slots[0].start_time).toBe('13:30');
      expect(slots[0].end_time).toBe('15:30');
      expect(slots[0].first_name).toBe('John');
      expect(slots[0].last_name).toBe('Doe');
      expect(slots[0].image_path).toBe(null);
      
      // No second slot because:
      // - Client needs 2 hours (13:30-15:30)
      // - But availability only goes until 15:30
      // - So only one 2-hour treatment can fit starting at 13:30
    });
  });
});