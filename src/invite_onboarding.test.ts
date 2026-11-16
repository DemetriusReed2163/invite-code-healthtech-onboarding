import assert from "node:assert/strict";
import test from "node:test";
import { decideOnboarding, patientSafeNotification } from "./invite_onboarding.ts";

test("only an accepted invite with a passing captcha reaches onboarding", () => {
  assert.deepEqual(decideOnboarding("HEALTH-2026", "HEALTH-2026", true), {
    accepted: true,
    reason: "invite accepted",
  });
  assert.deepEqual(decideOnboarding("OTHER", "HEALTH-2026", true), {
    accepted: false,
    reason: "invite rejected",
  });
  assert.deepEqual(decideOnboarding("HEALTH-2026", "HEALTH-2026", false), {
    accepted: false,
    reason: "captcha rejected",
  });
});

test("appointment notification contains no clinical detail", () => {
  assert.equal(
    patientSafeNotification("Mina", "2026-11-12 09:30"),
    "Appointment confirmed for Mina on 2026-11-12 09:30. Please use your care team's usual contact channel for questions.",
  );
});
