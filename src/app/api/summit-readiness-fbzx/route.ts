import { NextResponse } from "next/server";

const FORM_VIEW_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSchaXGfiaO3ynpzwmy2keiSQGRKDsoZVqDyAOdztWyq_iVMAA/viewform";

export async function GET() {
  try {
    const res = await fetch(FORM_VIEW_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FormSubmit/1.0)" },
    });
    const html = await res.text();
    const match =
      html.match(/"fbzx"\s+value="(\d+)"/) ?? html.match(/fbzx["\s]+value=["']?(\d+)/);
    const fbzx = match?.[1] ?? "";
    return NextResponse.json({ fbzx });
  } catch (error) {
    console.error("summit-readiness-fbzx error:", error);
    return NextResponse.json({ fbzx: "" }, { status: 500 });
  }
}
