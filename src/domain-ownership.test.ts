import assert from "node:assert/strict";
import { InfraiClient, completeOnboarding } from "./domain-ownership.ts";

const calls: Array<{ path: string; method: string; body?: string }> = [];
const fakeFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  calls.push({ path: url.pathname, method: init?.method ?? "", body: init?.body as string | undefined });
  const data = url.pathname.endsWith("/add") ? { zone_id: "zone_demo" } : url.pathname.endsWith("/verify") ? { verified: true } : { id: "user_demo" };
  return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { "content-type": "application/json" } });
};

const result = await completeOnboarding({ domain: "shop.example", email: "owner@example.com", txtName: "_infrai", txtValue: "proof" }, new InfraiClient("test-key", fakeFetch));
assert.equal(result.verified, true);
assert.equal(result.zone_id, "zone_demo");
assert.deepEqual(calls.map(call => call.path), ["/v1/dns/domain/add", "/v1/dns/record/upsert", "/v1/dns/domain/verify", "/v1/auth/user/get_by_email"]);
assert.equal(calls[1].method, "PUT");
console.log("ownership decision: verified");
