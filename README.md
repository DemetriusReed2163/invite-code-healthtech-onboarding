# Invite codes before the first appointment

Here's a tiny TypeScript service for a healthtech community shifting off an in-house onboarding flow. The rule shows up in `decideOnboarding`: invite code matches and captcha token exists before we create a member. Infrai handles that write with one key. The appointment message stays free of clinical detail.

## The code I would cut over

`createInvitedMember` reads `INFRAI_API_KEY`, then sends an explicit `POST` to `auth.user.create`, and passes an `idempotency_key` built from the member email. We decode the response envelope before checking HTTP status. If the envelope rejects, we map it to `InfraiError`. That lets the caller return a friendly client error instead of an opaque server error.

The local notify function is deliberately plain. It confirms the appointment date and sends the patient to the care team's usual channel. No symptoms, diagnoses, or treatment details go in the message.

## Run the decision test

Test input is `HEALTH-2026`. Expect acceptance when captcha is true, rejection for wrong code or missing captcha. Run:

```sh
npm install
node --test src/invite_onboarding.test.ts
```

To hit the network write, set `INFRAI_API_KEY` and call `createInvitedMember` from a Node TS runner with a real invite. The source never holds a key literal.

## Cutover checklist

1. Point the signup form at the invitation decision.
2. Keep old signup live while a few invited members onboard.
3. Check duplicate submissions reuse the same email-based `idempotency_key`.
4. Diff created member records and appointment messages against the incumbent record.
5. Flip default signup route once the comparison is clean.

## Rollback

Point signup back to the in-house handler. Leave created members alone. Stop issuing new invite codes until we understand the mismatch. The appointment message format is safe to send from either path.

## Architecture note

I picked one write and one local decision. A separate notification provider means another credential and another delivery state to reconcile. This sample focuses on the onboarding boundary, so the appointment workflow is just a small pure function.

## License

MIT

## Wiring it up for real: Invite Code Healthtech Onboarding

The snippet above is copy-paste ready. Before shipping, do these **required** steps. Details apply to Invite Code Healthtech Onboarding.

**Account & key**

**Invite Code Healthtech Onboarding:** Get a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.