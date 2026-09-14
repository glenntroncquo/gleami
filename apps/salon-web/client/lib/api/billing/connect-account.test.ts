import { NAV_PERMISSION } from "../../auth/permission-keys";
import {
  buildBillingPagePath,
  buildConnectOnboardBody,
  buildConnectReturnUrls,
  canTakeCardCharges,
  COMPANY_PAYMENT_ACCOUNT_SELECT,
  COMPANY_PAYMENT_ACCOUNT_TABLE,
  deriveConnectStatus,
  describeConnectOnboardPayload,
  fetchCompanyPaymentAccount,
  parseConnectOnboardResponse,
  resolveStripeConnectOnboard,
  STRIPE_CONNECT_ONBOARD_FN,
} from "./connect-account";

const LIVE_ONBOARD_ENVELOPE = {
  success: true,
  data: {
    url: "https://connect.stripe.com/setup/s/abc",
    expires_at: 1_788_711_033,
    account: {
      provider: "stripe",
      provider_account_id: "acct_123",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    },
  },
};

const LIVE_ONBOARD_RESULT = {
  url: "https://connect.stripe.com/setup/s/abc",
  account: "acct_123",
};

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function run() {
  assertEqual(
    NAV_PERMISSION.billing,
    ["billing:manage"],
    "billing nav is gated by billing:manage",
  );
  assertEqual(
    COMPANY_PAYMENT_ACCOUNT_TABLE,
    "company_payment_account",
    "reads the live payment account table",
  );
  assertEqual(
    COMPANY_PAYMENT_ACCOUNT_SELECT,
    "provider_account_id, charges_enabled, payouts_enabled, details_submitted, updated_at",
    "selects the live status flags",
  );
  assertEqual(
    STRIPE_CONNECT_ONBOARD_FN,
    "stripe-connect-onboard",
    "onboards through the existing edge function",
  );

  assertEqual(
    deriveConnectStatus(null).kind,
    "not_connected",
    "missing row needs first-time onboarding",
  );
  assertEqual(
    deriveConnectStatus({
      provider_account_id: "  ",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      updated_at: null,
    }).kind,
    "not_connected",
    "blank account id is treated as not connected",
  );
  assertEqual(
    deriveConnectStatus({
      provider_account_id: "acct_123",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      updated_at: "2026-09-06T12:00:00Z",
    }).kind,
    "needs_onboarding",
    "linked account without submitted details needs onboarding",
  );
  assertEqual(
    deriveConnectStatus({
      provider_account_id: "acct_123",
      charges_enabled: false,
      payouts_enabled: true,
      details_submitted: true,
      updated_at: null,
    }).kind,
    "restricted",
    "submitted details with a disabled rail is restricted",
  );
  assertEqual(
    deriveConnectStatus({
      provider_account_id: "acct_123",
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      updated_at: null,
    }).kind,
    "ready",
    "charges and payouts enabled is ready",
  );

  assertEqual(
    canTakeCardCharges(deriveConnectStatus(null)),
    false,
    "missing account cannot take card charges",
  );
  assertEqual(
    canTakeCardCharges(
      deriveConnectStatus({
        provider_account_id: "acct_123",
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
        updated_at: null,
      }),
    ),
    false,
    "restricted without charges cannot take card charges",
  );
  assertEqual(
    canTakeCardCharges(
      deriveConnectStatus({
        provider_account_id: "acct_123",
        charges_enabled: true,
        payouts_enabled: false,
        details_submitted: true,
        updated_at: null,
      }),
    ),
    true,
    "charges_enabled is enough for POS card even if payouts are off",
  );
  assertEqual(
    canTakeCardCharges(
      deriveConnectStatus({
        provider_account_id: "acct_123",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        updated_at: null,
      }),
    ),
    true,
    "ready accounts can take card charges",
  );

  assertEqual(
    buildBillingPagePath("nl"),
    "/nl/billing",
    "billing path keeps the locale prefix",
  );
  assertEqual(
    buildConnectReturnUrls("https://app.gleami.test/", "nl"),
    {
      return_url: "https://app.gleami.test/nl/billing?connect=return",
      refresh_url: "https://app.gleami.test/nl/billing?connect=refresh",
    },
    "stripe return and refresh land back on billing",
  );
  assertEqual(
    buildConnectOnboardBody({
      companyId: "co-1",
      returnUrl: "https://app.gleami.test/nl/billing?connect=return",
      refreshUrl: "https://app.gleami.test/nl/billing?connect=refresh",
    }),
    {
      company_id: "co-1",
      return_url: "https://app.gleami.test/nl/billing?connect=return",
      refresh_url: "https://app.gleami.test/nl/billing?connect=refresh",
    },
    "onboard body matches the live edge contract",
  );
  assertEqual(
    parseConnectOnboardResponse({ url: "https://connect.stripe.com/setup/s/abc" }),
    { url: "https://connect.stripe.com/setup/s/abc", account: null },
    "parses a flat Account Link url",
  );
  assertEqual(
    parseConnectOnboardResponse({ account: "acct_123" }),
    { url: null, account: "acct_123" },
    "parses account id when no url is returned",
  );
  assertEqual(
    parseConnectOnboardResponse(LIVE_ONBOARD_ENVELOPE),
    LIVE_ONBOARD_RESULT,
    "live Network { success, data: { url, account: object } } yields data.data.url",
  );
  assertEqual(
    typeof LIVE_ONBOARD_ENVELOPE.data.account,
    "object",
    "live account is an object — url unwrap must not require a string account",
  );
  assertEqual(
    parseConnectOnboardResponse({ data: { url: LIVE_ONBOARD_RESULT.url } }),
    { url: LIVE_ONBOARD_RESULT.url, account: null },
    "reads data.url when the inner account object is absent",
  );
  assertEqual(
    parseConnectOnboardResponse(JSON.stringify(LIVE_ONBOARD_ENVELOPE)),
    LIVE_ONBOARD_RESULT,
    "parses a JSON string when invoke leaves the body as text",
  );
  assertEqual(
    parseConnectOnboardResponse({ data: LIVE_ONBOARD_ENVELOPE }),
    LIVE_ONBOARD_RESULT,
    "unwraps a second data wrapper around the live envelope",
  );
  assertEqual(
    parseConnectOnboardResponse({
      success: true,
      data: JSON.stringify(LIVE_ONBOARD_ENVELOPE.data),
    }),
    LIVE_ONBOARD_RESULT,
    "parses a stringified inner data object",
  );
  assertEqual(
    describeConnectOnboardPayload(LIVE_ONBOARD_ENVELOPE),
    {
      typeof: "object",
      keys: ["success", "data"],
      nestedDataKeys: ["url", "expires_at", "account"],
      success: true,
    },
    "logs the live envelope keys without the url value",
  );
  assertEqual(
    describeConnectOnboardPayload(JSON.stringify(LIVE_ONBOARD_ENVELOPE)),
    {
      typeof: "string",
      keys: ["success", "data"],
      nestedDataKeys: ["url", "expires_at", "account"],
      success: true,
    },
    "string bodies still report parsed keys",
  );
  assertEqual(
    resolveStripeConnectOnboard(LIVE_ONBOARD_ENVELOPE),
    { ...LIVE_ONBOARD_RESULT, error: null },
    "live 200 envelope does not toast",
  );
  assertEqual(
    resolveStripeConnectOnboard(JSON.stringify(LIVE_ONBOARD_ENVELOPE)),
    { ...LIVE_ONBOARD_RESULT, error: null },
    "stringified 200 envelope does not toast",
  );
  assertEqual(
    resolveStripeConnectOnboard({ success: true, data: {} }),
    {
      url: null,
      account: null,
      error: "Failed to start Stripe onboarding",
    },
    "missing url and account after parse shows the hardcoded toast",
  );
  assertEqual(
    resolveStripeConnectOnboard({
      success: false,
      error: "account_restricted",
    }),
    {
      url: null,
      account: null,
      error: "account_restricted",
    },
    "success:false uses the edge error instead of redirecting",
  );
  assertEqual(
    resolveStripeConnectOnboard({ account: "acct_123" }),
    { url: null, account: "acct_123", error: null },
    "account without url reloads instead of toasting",
  );
}

async function testFetchQuery() {
  const calls: string[] = [];
  const result = await fetchCompanyPaymentAccount("co-1", {
    from(relation: string) {
      calls.push(`from:${relation}`);
      return {
        select(columns: string) {
          calls.push(`select:${columns}`);
          return {
            eq(column: string, value: string) {
              calls.push(`eq:${column}:${value}`);
              return {
                maybeSingle: async () => ({
                  data: {
                    provider_account_id: "acct_1",
                    charges_enabled: true,
                    payouts_enabled: false,
                    details_submitted: true,
                    updated_at: null,
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  });

  assertEqual(
    calls,
    [
      "from:company_payment_account",
      `select:${COMPANY_PAYMENT_ACCOUNT_SELECT}`,
      "eq:company_id:co-1",
    ],
    "reads company_payment_account by company_id",
  );
  assertEqual(result.error, null, "successful read has no error");
  assertEqual(
    deriveConnectStatus(result.data).kind,
    "restricted",
    "fetched flags feed the same status helper",
  );
}

run();
void testFetchQuery()
  .then(() => {
    console.log("connect-account.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
