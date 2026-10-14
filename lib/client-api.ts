type JsonObject = Record<string, unknown>;

const connectionMessage = "Unable to reach the server. Check your connection and try again.";

export async function requestJson<T extends JsonObject = JsonObject>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ response: Response; data: T }> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new Error(connectionMessage);
  }

  const body = await response.text();
  if (!body) return { response, data: {} as T };

  try {
    return { response, data: JSON.parse(body) as T };
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an unreadable response. Please try again."
        : `The request failed (${response.status}). Please try again.`,
    );
  }
}

export function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
