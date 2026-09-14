import {
  shiftIsoTimestamp,
  shiftLocalTimestamp,
} from "./move-staff-appointment-times";

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
  const hour = 60 * 60 * 1000;

  assertEqual(
    shiftLocalTimestamp("2026-09-17T13:00:00", hour),
    "2026-09-17T14:00:00",
    "naive appointment.start shifts as local wall clock",
  );
  assertEqual(
    shiftLocalTimestamp("2026-09-17T13:00:00", -30 * 60 * 1000),
    "2026-09-17T12:30:00",
    "naive appointment.start can move earlier",
  );
  assertEqual(
    shiftIsoTimestamp("2026-09-17T11:00:00.000Z", hour),
    "2026-09-17T12:00:00.000Z",
    "segment/phase timestamptz shifts in UTC",
  );
}

run();
console.log("move-staff-appointment.test.ts passed");
