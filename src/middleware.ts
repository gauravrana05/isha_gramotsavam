import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log("Middleware: Processing pathname:", pathname);

  if (pathname === "/") {
    console.log("Middleware: Redirecting / to /en");
    return NextResponse.redirect(new URL("/en", request.url));
  }

  console.log("Middleware: Continuing with pathname:", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/:path*"],
};