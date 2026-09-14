import {
  buildCreateStaffAppointmentBody,
  type CreateStaffAppointmentInput,
} from "./create-staff-appointment-payload";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function run() {
  const start = new Date(2026, 8, 17, 13, 0, 0, 0);
  const input: CreateStaffAppointmentInput = {
    start,
    staffId: "11111111-1111-1111-1111-111111111111",
    companyId: "22222222-2222-2222-2222-222222222222",
    locationId: "55555555-5555-5555-5555-555555555555",
    services: [
      {
        serviceId: "33333333-3333-3333-3333-333333333333",
        serviceVariantId: "44444444-4444-4444-4444-444444444444",
        staffId: "11111111-1111-1111-1111-111111111111",
      },
    ],
    price: 180,
    firstName: "Cindy",
    lastName: "De Koninck",
    email: "cindydekoninck4@gmail.com",
    notes: "window seat",
    staffNotes: "keratin",
  };

  const body = buildCreateStaffAppointmentBody(input);

  assertEqual(body.start, "2026-09-17T13:00:00", "start is a local timestamp");
  assertEqual(body.email, "cindydekoninck4@gmail.com", "email is passed through");
  assertEqual(body.firstName, "Cindy", "firstName is passed through");
  assertEqual(body.lastName, "De Koninck", "lastName is passed through");
  assertEqual(body.staffId, input.staffId, "visit staffId is passed through");
  assertEqual(body.companyId, input.companyId, "companyId is passed through");
  assertEqual(body.locationId, input.locationId, "locationId is passed through");
  assertEqual(body.price, 180, "price is passed through");
  assertEqual(body.notes, "window seat", "notes is passed through");
  assertEqual(body.staff_notes, "keratin", "staff notes use staff_notes");
  assertEqual(
    body.services,
    [
      {
        serviceId: "33333333-3333-3333-3333-333333333333",
        serviceVariantId: "44444444-4444-4444-4444-444444444444",
        staffId: "11111111-1111-1111-1111-111111111111",
      },
    ],
    "services use serviceId / serviceVariantId / staffId",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(body, "clientId"),
    false,
    "body must not send a pre-created clientId",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(body, "client_id"),
    false,
    "body must not send client_id",
  );

  const walkIn = buildCreateStaffAppointmentBody({
    start,
    staffId: input.staffId,
    companyId: input.companyId,
    services: input.services,
    email: "   ",
  });
  assertEqual(walkIn.email, "", "empty email is a walk-in");
  assertEqual(
    Object.prototype.hasOwnProperty.call(walkIn, "firstName"),
    false,
    "omit blank firstName",
  );
}

run();
console.log("create-staff-appointment.test.ts passed");
