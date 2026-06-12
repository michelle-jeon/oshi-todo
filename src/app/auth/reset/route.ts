import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const response = NextResponse.redirect(
    new URL(
      `/login?message=${encodeURIComponent("로그인 세션이 만료됐어요. 다시 로그인해 주세요.")}`,
      requestUrl.origin
    )
  );
  const cookieStore = await cookies();

  cookieStore
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))
    .forEach((cookie) => response.cookies.delete(cookie.name));

  return response;
}
