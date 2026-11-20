import { z } from "zod";
import { normalizeDomainOrigin } from "@/lib/catalog";
import {
  checkout,
  checkoutInput,
  contact,
  CommerceError,
  signupInput,
  subscribe,
  ticketInput,
  track,
  trackInput,
} from "@/lib/commerce";
import { getSiteSettings } from "@/lib/db";

const limits = new Map<string, { last: number; count: number }>();
function throttled(key: string) {
  const now = Date.now();
  if (limits.size > 5000)
    for (const [entry, value] of limits)
      if (now - value.last > 60_000) limits.delete(entry);
  if (limits.size > 5500 && !limits.has(key)) return true;
  const state = limits.get(key);
  if (!state || now - state.last > 60_000) {
    limits.set(key, { last: now, count: 1 });
    return false;
  }
  return ++state.count > 20;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const host = request.headers.get("host") || "";
  const loopback = /^(localhost|127\.0\.0\.1|\[::1\])(:[1-9][0-9]{0,4})?$/.test(
    host,
  );
  const lanOrigin = process.env.PREVIEW_LAN_ORIGIN
    ? new URL(process.env.PREVIEW_LAN_ORIGIN)
    : null;
  const configuredDomain = await getSiteSettings()
    .then((s) => normalizeDomainOrigin(s.domain))
    .catch(() => null);
  const configuredDomainUrl = configuredDomain
    ? new URL(configuredDomain)
    : null;
  const origin =
    lanOrigin?.host === host
      ? lanOrigin.origin
      : configuredDomainUrl?.host === host
        ? configuredDomainUrl.origin
        : process.env.APP_ORIGIN
          ? new URL(process.env.APP_ORIGIN).origin
          : loopback
            ? "http://" + host
            : null;
  if (
    !origin ||
    request.headers.get("origin") !== origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  ) {
    return Response.json(
      { error: "This request could not be accepted." },
      { status: 403 },
    );
  }
  if (throttled(action + ":" + (request.headers.get("x-real-ip") || "local")))
    return Response.json(
      { error: "Please wait a minute and try again." },
      { status: 429 },
    );
  try {
    const text = await request.text();
    if (text.length > 12_000)
      return Response.json({ error: "Request is too large." }, { status: 413 });
    const body: unknown = JSON.parse(text);
    if (action === "checkout")
      return Response.json(await checkout(checkoutInput.parse(body), origin));
    if (action === "track")
      return Response.json(await track(trackInput.parse(body)));
    if (action === "contact")
      return Response.json(await contact(ticketInput.parse(body)));
    if (action === "newsletter")
      return Response.json(await subscribe(signupInput.parse(body)));
    return Response.json({ error: "Page unavailable." }, { status: 404 });
  } catch (error) {
    if (error instanceof CommerceError)
      return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json(
        { error: "Check all fields and try again." },
        { status: 400 },
      );
    console.error(
      "Commerce operation failed",
      action,
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      { error: "The preview service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
