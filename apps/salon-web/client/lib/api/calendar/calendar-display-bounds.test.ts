import {
  calendarDisplayBounds,
  layoutCalendarSegmentBounds,
} from "./calendar-display-bounds";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

function hhmmUtc(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function run() {
  // Glenn smoke d554ac2f: naive header 09:30–12:30 Brussels = 07:30–10:30Z.
  // Written phases are 40+40 and 40 (recipe is 60+60 and 60).
  const keratinPhases = [
    {
      phase_type: "busy",
      starts_at: "2026-09-04T07:30:00.000Z",
      ends_at: "2026-09-04T08:10:00.000Z",
    },
    {
      phase_type: "free",
      starts_at: "2026-09-04T08:10:00.000Z",
      ends_at: "2026-09-04T08:50:00.000Z",
    },
  ];
  const ledSpaPhases = [
    {
      phase_type: "busy",
      starts_at: "2026-09-04T08:50:00.000Z",
      ends_at: "2026-09-04T09:30:00.000Z",
    },
  ];

  const laidOut = layoutCalendarSegmentBounds({
    segments: [
      {
        phases: keratinPhases,
        startsAt: "2026-09-04T07:30:00.000Z",
        endsAt: "2026-09-04T08:50:00.000Z",
      },
      {
        phases: ledSpaPhases,
        startsAt: "2026-09-04T08:50:00.000Z",
        endsAt: "2026-09-04T09:30:00.000Z",
      },
    ],
    appointmentStart: "2026-09-04T07:30:00.000Z",
    appointmentEnd: "2026-09-04T10:30:00.000Z",
  });

  assertEqual(hhmmUtc(laidOut.visit!.start), "07:30", "visit starts at header/client 09:30 Brussels");
  assertEqual(hhmmUtc(laidOut.visit!.end), "10:30", "visit ends at header/client 12:30 Brussels");
  assertEqual(hhmmUtc(laidOut.segments[0]!.start), "07:30", "keratin starts at visit start");
  assertEqual(hhmmUtc(laidOut.segments[0]!.end), "09:30", "keratin scales 80min → 120min");
  assertEqual(hhmmUtc(laidOut.segments[1]!.start), "09:30", "led spa follows keratin");
  assertEqual(hhmmUtc(laidOut.segments[1]!.end), "10:30", "led spa scales 40min → 60min");

  const correctPhases = layoutCalendarSegmentBounds({
    segments: [
      {
        phases: [
          {
            phase_type: "busy",
            starts_at: "2026-09-04T07:30:00.000Z",
            ends_at: "2026-09-04T08:30:00.000Z",
          },
          {
            phase_type: "free",
            starts_at: "2026-09-04T08:30:00.000Z",
            ends_at: "2026-09-04T09:30:00.000Z",
          },
        ],
        startsAt: "2026-09-04T07:30:00.000Z",
        endsAt: "2026-09-04T09:30:00.000Z",
      },
      {
        phases: [
          {
            phase_type: "busy",
            starts_at: "2026-09-04T09:30:00.000Z",
            ends_at: "2026-09-04T10:30:00.000Z",
          },
        ],
        startsAt: "2026-09-04T09:30:00.000Z",
        endsAt: "2026-09-04T10:30:00.000Z",
      },
    ],
    appointmentStart: "2026-09-04T07:30:00.000Z",
    appointmentEnd: "2026-09-04T10:30:00.000Z",
  });

  assertEqual(hhmmUtc(correctPhases.segments[0]!.start), "07:30", "correct keratin start unchanged");
  assertEqual(hhmmUtc(correctPhases.segments[0]!.end), "09:30", "correct keratin end unchanged");
  assertEqual(hhmmUtc(correctPhases.segments[1]!.start), "09:30", "correct led spa start unchanged");
  assertEqual(hhmmUtc(correctPhases.segments[1]!.end), "10:30", "correct led spa end unchanged");

  const single = calendarDisplayBounds({
    phases: keratinPhases,
    segmentStartsAt: "2026-09-04T07:30:00.000Z",
    segmentEndsAt: "2026-09-04T08:50:00.000Z",
    appointmentStart: "2026-09-04T07:30:00.000Z",
    appointmentEnd: "2026-09-04T10:30:00.000Z",
    isSingleSegment: true,
  });
  assertEqual(hhmmUtc(single.start), "07:30", "single-segment stretch start");
  assertEqual(hhmmUtc(single.end), "10:30", "single-segment stretch uses header end");

  const shortBusy = calendarDisplayBounds({
    phases: [
      {
        phase_type: "busy",
        starts_at: "2026-09-04T07:30:00.000Z",
        ends_at: "2026-09-04T08:00:00.000Z",
      },
    ],
    segmentStartsAt: "2026-09-04T07:30:00.000Z",
    segmentEndsAt: "2026-09-04T08:00:00.000Z",
    appointmentStart: "2026-09-04T07:30:00.000Z",
    appointmentEnd: "2026-09-04T08:00:00.000Z",
    isSingleSegment: true,
  });
  assertEqual(hhmmUtc(shortBusy.end), "08:00", "normal 30-min service stays 30 min");

  const missingHeaderEnd = layoutCalendarSegmentBounds({
    segments: [
      {
        phases: keratinPhases,
        startsAt: "2026-09-04T07:30:00.000Z",
        endsAt: "2026-09-04T08:50:00.000Z",
      },
    ],
    appointmentStart: "2026-09-04T07:30:00.000Z",
    appointmentEnd: null,
  });
  assertEqual(
    hhmmUtc(missingHeaderEnd.visit!.end),
    "08:50",
    "missing header end uses busy+free union",
  );

  console.log("calendar-display-bounds tests passed");
}

run();
