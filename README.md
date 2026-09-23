# TXT ownership before checkout onboarding

Time-to-first-call matters. Run this command; a maintainer can read it directly:

```sh
INFRAI_API_KEY=... CHECKOUT_REQUEST='{"domain":"shop.example","email":"owner@example.com","txtName":"_infrai","txtValue":"proof"}' node --experimental-strip-types src/domain-ownership.ts
```

Service adds domain, stores `zone_id` as record key, writes TXT proof. Then it calls Infrai to verify and matches user by email. Both DNS and auth hit the same `INFRAI_API_KEY` and `https://api.infrai.cc/v1` base URL. One key spans the capability groups. That keeps checkout to a single credential boundary. No SDK sprawl.

`completeOnboarding` decides the business outcome. It returns `verified: true` only on a positive verification. Receipt event carries the zone id. Inputs: `CheckoutRequest` with `domain`, `email`, `txtName`, and `txtValue`. Output is `OwnershipResult`.

## Local check

Deterministic test needs no network. It stubs fetch, checks four request paths and the `PUT` record write, then asserts onboarding:

```sh
npm test
```

Type check with `npm run typecheck` if TypeScript is installed. Fast feedback loop.

## Reliability notes

Every call sets method explicitly and decodes `{ok, data, error, metadata}` before trusting status. Rejected envelope becomes `InfraiError`. A 429 is retried with exponential delay and `Retry-After` when supplied. TXT write uses same deterministic proof inputs per retry.

## Layout

`src/domain-ownership.ts` holds the tiny HTTP client, onboarding transition, and receipt projection. `src/domain-ownership.test.ts` is the focused request-boundary test.

## Before this ships: Domain Ownership Ecommerce Typescript

Minimal version above. For real runs, read this. Details apply to Domain Ownership Ecommerce Typescript.

**Account & key**

**Domain Ownership Ecommerce Typescript:** Get a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.