import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { supabase } from "../supabase";
import { 
  addCompany, 
  addStaff, 
  addTreatment, 
  addPriceOption, 
  addAvailability, 
  addStaffTreatment, 
  bookAppointment, 
  updateCompanySettings, 
  cleanDatabase
} from "../steps/helpers";

describe("Appointment Business Logic Tests", () => {
    beforeEach(async () => {
        await cleanDatabase();
        });

    afterEach(async () => {
        await cleanDatabase();
    });

    describe("Appointment Overlap Detection", () => {
        it("should detect overlapping appointments for the same staff member", async () => {
            // Arrange
            const company = await addCompany({ name: "Test Salon" });
            const staff = await addStaff({
            first_name: "John",
            last_name: "Doe",
            email: "john.doe@testsalon.com",
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
            duration_in_minutes: 120,
            actual_duration_in_minutes: 60
            });

            await addStaffTreatment(staff.id, treatment.id, company.id);

            const today = new Date();
            
            // Add availability for the staff member
            const availabilityStart = new Date(today);
            availabilityStart.setHours(7, 0, 0, 0);
            const availabilityEnd = new Date(today);
            availabilityEnd.setHours(18, 0, 0, 0);

            await addAvailability({
                staff_id: staff.id,
                company_id: company.id,
                start: availabilityStart.toISOString(),
                end: availabilityEnd.toISOString()
            });
            
            // Create first appointment: 8:00-10:00
            const firstStart = new Date(today);
            firstStart.setHours(8, 0, 0, 0);
            const firstEnd = new Date(firstStart);
            firstEnd.setHours(10, 0, 0, 0);

            await bookAppointment({
            start: firstStart.toISOString(),
            end: firstEnd.toISOString(),
            staffId: staff.id,
            companyId: company.id,
            treatmentId: treatment.id,
            priceOptionId: priceOption.id,
            price: 50.00,
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith1@test.com"
            });

            // Act - Try to create overlapping appointment: 8:30-10:30
            const overlappingStart = new Date(today);
            overlappingStart.setHours(8, 30, 0, 0);
            const overlappingEnd = new Date(overlappingStart);
            overlappingEnd.setHours(10, 30, 0, 0);

            let overlappingError: Error | null = null;
            try {
                await bookAppointment({
                    start: overlappingStart.toISOString(),
                    end: overlappingEnd.toISOString(),
                    staffId: staff.id,
                    companyId: company.id,
                    treatmentId: treatment.id,
                    priceOptionId: priceOption.id,
                    price: 50.00,
                    firstName: "Jane",
                    lastName: "Smith",
                    email: "jane.smith2@test.com"
                });
            } catch (error) {
                overlappingError = error as Error;
            }

            // Assert - The edge function should prevent overlapping appointments
            expect(overlappingError).toBeDefined();
            expect(overlappingError!.message).toContain("Booking failed");
            
            // Verify only 1 appointment exists
            const { data: appointments } = await supabase
            .from("appointment")
            .select("*")
            .eq("staff_id", staff.id);

            expect(appointments).toHaveLength(1);
        });
    });
});