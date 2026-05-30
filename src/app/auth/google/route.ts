import { NextResponse } from "next/server";

export function GET(request: Request) {
  const requestUrl = new URL(request.url);

  return NextResponse.redirect(
    new URL(
      `/login?message=${encodeURIComponent("Google 버튼으로 다시 로그인해 주세요.")}`,
      requestUrl.origin
    )
  );
}
