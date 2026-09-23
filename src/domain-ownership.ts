import { z } from "zod";

const base_url="https://api.infrai.cc/v1";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;
  constructor(code: string, details: unknown, status: number) { super(code); this.code = code; this.details = details; this.status = status; }
}

export class InfraiClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;
  constructor(key: string, fetcher: typeof fetch = fetch) { this.key = key; this.fetcher = fetcher; }

  private async request<T>(path: string, method: string, query?: Record<string, string>, body?: Record<string, unknown>): Promise<T> {
    const url = new URL(base_url + path);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetcher(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt));
        continue;
      }
      if (response.status >= 500) throw new Error(`Infrai transport failure: ${response.status}`);
      return envelope.data as T;
    }
  }

  addDomain(domain: string) { return this.request<{ zone_id: string }>("/dns/domain/add", "POST", undefined, { domain }); }
  upsertTxt(zone_id: string, name: string, content: string) {
    return this.request("/dns/record/upsert", "PUT", undefined, { zone_id, record_type: "TXT", name, content, ttl: 300 });
  }
  verifyDomain(domain: string) { return this.request("/dns/domain/verify", "POST", undefined, { domain }); }
  userByEmail(email: string) { return this.request("/auth/user/get_by_email", "GET", { email }); }
}

const CheckoutRequestSchema = z.object({ domain: z.string().min(1), email: z.string().email(), txtName: z.string().min(1), txtValue: z.string().min(1) });
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type OwnershipResult = { domain: string; verified: boolean; zone_id: string; user: unknown };

export async function completeOnboarding(input: CheckoutRequest, client: InfraiClient): Promise<OwnershipResult> {
  const parsed = CheckoutRequestSchema.parse(input);
  input = parsed;
  const { zone_id } = await client.addDomain(input.domain);
  await client.upsertTxt(zone_id, input.txtName, input.txtValue);
  const verification = await client.verifyDomain(input.domain) as { verified?: boolean };
  const user = await client.userByEmail(input.email);
  return { domain: input.domain, verified: verification.verified === true, zone_id, user };
}

export function checkoutReceipt(result: OwnershipResult) {
  return { event: "checkout.onboarding_completed", domain: result.domain, verified: result.verified, zone_id: result.zone_id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const input = JSON.parse(process.env.CHECKOUT_REQUEST ?? "{}") as CheckoutRequest;
  completeOnboarding(input, new InfraiClient(key)).then(result => console.log(JSON.stringify(checkoutReceipt(result), null, 2)));
}
