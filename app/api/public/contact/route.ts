const CONTACT_API_URL = process.env.ARYAN_GOLD_CONTACTS_API_URL ?? "https://aryangoldbuyers.com/api/contacts";

type ContactRequest = {
  name?: unknown;
  mobile?: unknown;
  weight?: unknown;
  consent?: unknown;
};

function errorResponse(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 5_000) return errorResponse("Request is too large.", 413);

  let body: ContactRequest;
  try {
    body = await request.json() as ContactRequest;
  } catch {
    return errorResponse("Please submit valid contact details.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mobile = typeof body.mobile === "string" ? body.mobile.replace(/\D/g, "") : "";
  const weight = typeof body.weight === "string" || typeof body.weight === "number" ? String(body.weight).trim() : "";
  const numericWeight = Number(weight);

  if (name.length < 2 || name.length > 80) return errorResponse("Please enter your name.", 400);
  if (!/^\d{10}$/.test(mobile)) return errorResponse("Please enter a valid 10-digit mobile number.", 400);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0 || numericWeight > 100_000) return errorResponse("Please enter a valid gold weight.", 400);
  if (body.consent !== true) return errorResponse("Please authorize Aryan Gold to contact you.", 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(CONTACT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        name,
        mobile,
        city: "",
        weight,
        preferredDate: "",
        preferredTime: "",
        businessType: "Banner Form",
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return errorResponse("We could not send your request right now. Please try again.", 502);
    }

    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("We could not reach our contact service. Please try again shortly.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
