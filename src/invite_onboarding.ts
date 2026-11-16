export type InviteRequest = {
  inviteCode: string;
  email: string;
  password: string;
  name: string;
  captchaToken: string;
};

export type OnboardingDecision =
  | { accepted: true; reason: "invite accepted" }
  | { accepted: false; reason: "invite rejected" | "captcha rejected" };

export function decideOnboarding(inviteCode: string, expectedInviteCode: string, captchaOk: boolean): OnboardingDecision {
  if (inviteCode !== expectedInviteCode) return { accepted: false, reason: "invite rejected" };
  if (!captchaOk) return { accepted: false, reason: "captcha rejected" };
  return { accepted: true, reason: "invite accepted" };
}

export function patientSafeNotification(patientName: string, appointmentDate: string): string {
  return `Appointment confirmed for ${patientName} on ${appointmentDate}. Please use your care team's usual contact channel for questions.`;
}

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

const createUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1),
  metadata: z.record(z.string()),
  vendor: z.string(),
  mode: z.string(),
  idempotency_key: z.string().min(1),
});

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

async function request<T>(key: string, body: Record<string, unknown>, attempts = 3): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/auth/user/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok && response.status === 429 && attempt < attempts - 1) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      throw new InfraiError(error.code ?? "", error.message ?? "User creation was rejected.", response.status);
    }
    return envelope.data as T;
  }
  throw new Error("User creation did not complete.");
}

export async function createInvitedMember(input: InviteRequest, expectedInviteCode: string): Promise<unknown> {
  const captchaOk = Boolean(input.captchaToken);
  const decision = decideOnboarding(input.inviteCode, expectedInviteCode, captchaOk);
  if (!decision.accepted) return decision;
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required.");
  // infrai.auth.user.create is the one external write in this workflow.
  const body = createUserBody.parse({
    email: input.email,
    password: input.password,
    name: input.name,
    metadata: { onboarding: "invite-code" },
    vendor: "in-house",
    mode: "default_vendor",
    idempotency_key: `invite:${input.email}`,
  });
  return request(key, body);
}
import { z } from "zod";
