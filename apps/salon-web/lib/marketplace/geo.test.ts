import { parseGeoPoint, parseLatLngInput, toEwkt } from "./geo";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

function run() {
  assertEqual(toEwkt(50.85, 4.35), "SRID=4326;POINT(4.35 50.85)", "EWKT is longitude then latitude");
  assertEqual(parseLatLngInput("50,8503", "4,3517"), { lat: 50.8503, lng: 4.3517 }, "dutch decimal comma");
  assertEqual(parseLatLngInput("91", "4"), null, "latitude out of range");
  assertEqual(parseLatLngInput("", "4"), null, "blank latitude");
  assertEqual(
    parseGeoPoint("SRID=4326;POINT(4.35 50.85)"),
    { lat: 50.85, lng: 4.35 },
    "parse EWKT",
  );
  assertEqual(
    parseGeoPoint({ type: "Point", coordinates: [4.35, 50.85] }),
    { lat: 50.85, lng: 4.35 },
    "parse GeoJSON",
  );
  assertEqual(parseGeoPoint(null), null, "null geography");
}

run();
console.log("geo.test.ts passed");
