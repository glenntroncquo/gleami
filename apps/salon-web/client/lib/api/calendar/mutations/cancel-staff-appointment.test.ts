import { buildCancelStaffAppointmentBody } from "./cancel-staff-appointment-payload";

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
  const withShop = buildCancelStaffAppointmentBody({
    appointmentId: "11111111-1111-1111-1111-111111111111",
    clientId: "22222222-2222-2222-2222-222222222222",
    companyId: "33333333-3333-3333-3333-333333333333",
    locationId: "44444444-4444-4444-4444-444444444444",
  });

  assertEqual(
    withShop,
    {
      appointmentId: "11111111-1111-1111-1111-111111111111",
      clientId: "22222222-2222-2222-2222-222222222222",
      companyId: "33333333-3333-3333-3333-333333333333",
      locationId: "44444444-4444-4444-4444-444444444444",
    },
    "staff cancel sends locationId with the appointment-cancel body",
  );
  assertEqual(
    Object.keys(withShop).sort(),
    ["appointmentId", "clientId", "companyId", "locationId"],
    "body is appointmentId, clientId, companyId, locationId",
  );

  const withoutShop = buildCancelStaffAppointmentBody({
    appointmentId: "11111111-1111-1111-1111-111111111111",
    clientId: "22222222-2222-2222-2222-222222222222",
    companyId: "33333333-3333-3333-3333-333333333333",
    locationId: "  ",
  });
  assertEqual(
    Object.prototype.hasOwnProperty.call(withoutShop, "locationId"),
    false,
    "omit blank locationId — the field is optional",
  );
}

run();
console.log("cancel-staff-appointment.test.ts passed");
