import { auth } from "~/utils/auth";

/**
 * API response helper for successful responses
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * API response helper for error responses
 */
export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Get authenticated user ID from request headers
 * Returns null if not authenticated (for API endpoints that support public access)
 */
export async function getAuthenticatedUserIdFromRequest(
  request: Request
): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Require authentication for an API endpoint
 * Throws an error that should be caught and returned as 401
 */
export async function requireAuth(request: Request): Promise<string> {
  const userId = await getAuthenticatedUserIdFromRequest(request);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Extract path parameter from URL path
 * e.g., extractPathParam("/api/v1/trees/123/members", "trees") returns "123"
 */
export function extractPathParam(path: string, afterSegment: string): string | null {
  const segments = path.split("/").filter(Boolean);
  const index = segments.indexOf(afterSegment);
  if (index !== -1 && index + 1 < segments.length) {
    return segments[index + 1];
  }
  return null;
}
