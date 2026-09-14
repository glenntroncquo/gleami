# Frontend contract — Connect onboarding + POS card capture

Gleami platform Stripe is merchant of record. Each company has at most one
connected payment account (`provider` is `stripe` now; `mollie` later).

Phase 2: card PaymentIntents are **destination charges**.
`transfer_data.destination` is the company's `provider_account_id`.
`application_fee_amount` is present and **0** until a commission % exists.
`on_behalf_of` is omitted so the platform stays merchant of record.

## Read account status (no RPC)

Any company member may read the row via RLS:

```ts
const { data, error } = await supabase
  .from("company_payment_account")
  .select(
    "provider, provider_account_id, charges_enabled, payouts_enabled, details_submitted, updated_at",
  )
  .eq("company_id", companyId)
  .maybeSingle();
```

`data` is `null` until an owner starts onboarding. Card checkout is allowed
only when `charges_enabled === true`. Do not treat `details_submitted` or a
return from Stripe as sufficient.

## Start / resume Account Link

`POST /functions/v1/stripe-connect-onboard`

Headers: `Authorization: Bearer <user access token>`, `apikey`, `Content-Type: application/json`.

Gated by existing `billing:manage` (company owner). Admin and location roles
get 403.

### Body

```json
{
  "company_id": "uuid",
  "return_url": "https://app.example/settings/billing?onboarding=return",
  "refresh_url": "https://app.example/settings/billing?onboarding=refresh"
}
```

Also accepted: `companyId`, `returnUrl`, `refreshUrl`. Both URLs must be absolute.

- `return_url` — Stripe redirects here after the user finishes or exits the form.
- `refresh_url` — Stripe redirects here when the link is expired; call this
  edge again and redirect to the new `url`.

### Success `200`

```json
{
  "success": true,
  "data": {
    "url": "https://connect.stripe.com/setup/e/acct_.../...",
    "expires_at": 1710000000,
    "account": {
      "provider": "stripe",
      "provider_account_id": "acct_...",
      "charges_enabled": false,
      "payouts_enabled": false,
      "details_submitted": false
    }
  }
}
```

Redirect the browser to `data.url`. `expires_at` is Unix seconds.

After return, re-query `company_payment_account`. Flags are kept in sync by
`payment-webhook` on `account.updated` — not by this redirect.

### Errors

| Status | When |
| --- | --- |
| 401 | Missing / invalid JWT |
| 403 | No company membership, or missing `billing:manage` |
| 404 | Unknown `company_id` |
| 400 | Validation or Stripe Account Link error. Body is `{ success: false, error, message, code? }`. `supabase.functions.invoke` hides this behind `error.context` — parse the JSON and show `error` / `message`. |

## POS card capture (Payment Element)

No new public RPCs. Same `order-create` edge as Phase 1.

1. Offer card only when `charges_enabled === true` (client-side hide is UX;
   the server still 409s).
2. `POST /functions/v1/order-create` with `payment_type: "card"`. The PI is
   `card` (Payment Element), **not** `card_present`. Destination-charged to
   `provider_account_id`, `application_fee_amount: 0`. POS does not send
   destination or fee fields.
3. Mount Payment Element with **`data.payments[].client_secret`**. Confirm on
   the client. `payment-webhook` marks the payment paid on
   `payment_intent.succeeded`.
4. Kaartterminal is a separate FE path: `POST /functions/v1/payment-process-terminal`
   with `company_id`, `reader_id`, `payment_intent_id`. Readers stay on the
   **platform** account (destination-charge model). Do not send
   `Stripe-Account`. Do not send an `order-create` card (Elements) PI here.
5. `payment-simulate-terminal` is test-only; same `company_id` + 409 gate.

Cash / invoice / bank_transfer are unchanged (no PaymentIntent; their
`client_secret` is `null`).

### Success `200`

OkResponse stays `{ success: true, data: { order_id, payments } }`.
After `supabase.functions.invoke`, that JSON is the invoke `data` value.
Read the Payment Element secret from **`data.payments[].client_secret`**
(snake_case). Card rows still include `payment_intent_id`.

```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "payments": [
      {
        "id": "uuid",
        "payment_type": "card",
        "amount": 25,
        "status": "pending",
        "payment_status": "unpaid",
        "paid": false,
        "payment_intent_id": "pi_...",
        "client_secret": "pi_..._secret_..."
      }
    ]
  }
}
```

If Stripe creates a PI without a secret, the order is rolled back and the
edge returns `502 STRIPE_CLIENT_SECRET_MISSING` — it does not leave an
unpaid order.

### Errors (card)

| Status | When |
| --- | --- |
| 409 `CHARGES_NOT_ENABLED` | Missing account, `charges_enabled !== true`, or provider is not `stripe` |
| 400 | Card amount `<= 0`, or Stripe PI create failed |
| 502 `STRIPE_CLIENT_SECRET_MISSING` | Stripe created a PI without `client_secret` (order rolled back) |

`payment-process-terminal` and `payment-simulate-terminal` use the same 409.

Reader registration (locations, connection tokens) is still a later phase.
Direct charges / connected-account readers are out of scope.
