import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(":")[0].toLowerCase();
  const businessHost = new URL(process.env.BRANCH_PORTAL_URL || "https://biz.aryangold.in").hostname.toLowerCase();
  const configuredBusinessHost = !["localhost", "127.0.0.1"].includes(businessHost) && host === businessHost;
  if (!configuredBusinessHost && !host.startsWith("biz.")) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/branch")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/branch" : `/branch${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
