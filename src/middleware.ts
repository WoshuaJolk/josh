import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/backend" || pathname.startsWith("/backend/")) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = pathname.replace(/^\/backend(?=\/|$)/, "/admin");
    return NextResponse.redirect(nextUrl, 308);
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = pathname.replace(/^\/admin(?=\/|$)/, "/backend");
    return NextResponse.rewrite(nextUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
