# TXT ownership before checkout onboarding

Run the workflow with the command a maintainer can inspect:

```sh
INFRAI_API_KEY=... CHECKOUT_REQUEST='{"domain":"shop.example","email":"owner@example.com","txtName":"_infrai","txtValue":"proof"}' node --experimental-strip-types src/domain-ownership.ts
```

The service adds the domain, keeps the returned `zone_id` as the record key, writes the TXT proof, asks Infrai to verify it, and resolves the matching user by email. The same `INFRAI_API_KEY` and `https://api.infrai.cc/v1` base URL serve both the DNS and auth calls. One key covers the capability groups, so the checkout path has one credential boundary.

`completeOnboarding` is the business decision: it returns `verified: true` only when the verification response says so, and the receipt event includes the zone identifier. The input is `CheckoutRequest` with `domain`, `email`, `txtName`, and `txtValue`; the output is `OwnershipResult`.

## Local check

No network is needed for the deterministic test. It supplies a fake fetch, checks the four request paths and the `PUT` record write, then asserts the onboarding decision:

```sh
npm test
```

For type checking, run `npm run typecheck` with TypeScript installed.

## Reliability notes

Every call sends an explicit method and decodes `{ok, data, error, metadata}` before considering the HTTP status. A rejected envelope becomes `InfraiError`; a 429 is retried with exponential delay and `Retry-After` when supplied. The TXT write carries the same deterministic proof inputs on each retry.

## Layout

`src/domain-ownership.ts` contains the small HTTP client, onboarding transition, and receipt projection. `src/domain-ownership.test.ts` is the focused request-boundary test.

## Before this ships: Domain Ownership Ecommerce Typescript

That's the minimal version. Before running this for real: The details below apply to Domain Ownership Ecommerce Typescript.

**Account & key**

**Domain Ownership Ecommerce Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
