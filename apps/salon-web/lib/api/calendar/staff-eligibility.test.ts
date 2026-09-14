import {
  eligibleStaffFor,
  staffIdIfEligible,
  staffOptionsForSelect,
  type StaffServiceLink,
  type StaffServiceVariantLink,
} from "./staff-eligibility";

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
  const ana = { id: "ana" };
  const cindy = { id: "cindy" };
  const staffList = [ana, cindy];
  const keratin = "svc-keratin";
  const kort = "var-kort";
  const led = "svc-led";
  const serviceLinks: StaffServiceLink[] = [
    { staff_id: "ana", service_id: keratin },
    { staff_id: "cindy", service_id: led },
  ];
  const variantLinks: StaffServiceVariantLink[] = [
    { staff_id: "ana", service_variant_id: kort },
  ];

  assertEqual(
    eligibleStaffFor(staffList, "", "", serviceLinks, variantLinks).map(
      (s) => s.id,
    ),
    ["ana", "cindy"],
    "no catalog selection lists all bookable staff",
  );

  assertEqual(
    eligibleStaffFor(staffList, keratin, kort, serviceLinks, variantLinks).map(
      (s) => s.id,
    ),
    ["ana"],
    "variant assignments filter the staff list",
  );

  assertEqual(
    eligibleStaffFor(staffList, led, "", serviceLinks, variantLinks).map(
      (s) => s.id,
    ),
    ["cindy"],
    "service assignments filter when no variant links match",
  );

  assertEqual(
    staffIdIfEligible("ana", staffList),
    "ana",
    "staff stays selected when still eligible",
  );

  assertEqual(
    staffIdIfEligible(
      "ana",
      eligibleStaffFor(staffList, led, "", serviceLinks, variantLinks),
    ),
    "",
    "incompatible service clears staff without blocking the catalog pick",
  );

  assertEqual(
    staffIdIfEligible(
      "ana",
      eligibleStaffFor(staffList, "", "", serviceLinks, variantLinks),
    ),
    "ana",
    "staff picked first stays until an incompatible service is chosen",
  );

  assertEqual(
    staffIdIfEligible(
      "",
      eligibleStaffFor(staffList, keratin, kort, serviceLinks, variantLinks),
    ),
    "",
    "empty staff stays empty and the field remains choosable",
  );

  assertEqual(
    staffOptionsForSelect(
      eligibleStaffFor(staffList, led, "", serviceLinks, variantLinks),
      staffList,
      "ana",
    ).map((s) => s.id),
    ["ana", "cindy"],
    "already-selected staff stays in the list so the field does not disappear",
  );
}

run();
console.log("staff-eligibility.test.ts passed");
