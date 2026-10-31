import { NextResponse } from "next/server";
import { decideOAuthConsent, isAuthorizationId } from "@/lib/auth/oauth-consent";

export async function POST(request: Request) {
  const formData = await request.formData();
  const decisionValue = formData.get("decision");
  const authorizationValue = formData.get("authorization_id");
  const authorizationId = typeof authorizationValue === "string" ? authorizationValue : null;
  const decision = decisionValue === "approve" || decisionValue === "deny" ? decisionValue : null;

  if (!isAuthorizationId(authorizationId)) {
    return NextResponse.json({ error: "Missing authorization request" }, { status: 400 });
  }
  if (!decision) {
    return NextResponse.json({ error: "Choose approve or deny" }, { status: 400 });
  }

  try {
    const redirectUrl = await decideOAuthConsent(authorizationId, decision);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finish this approval.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
