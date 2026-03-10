import { NextResponse } from "next/server";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSchaXGfiaO3ynpzwmy2keiSQGRKDsoZVqDyAOdztWyq_iVMAA/formResponse";

const ENTRY_IDS = {
  firstName: "entry.1328606392",
  email:     "entry.1362361142",
  q1:        "entry.1002851429",
  q2:        "entry.158149559",
  q3:        "entry.197086545",
  q4:        "entry.1995005739",
  q5:        "entry.1392028128",
  q6:        "entry.1044599284",
  q7:        "entry.1358412920",
  q8:        "entry.1064566425",
  q9:        "entry.1128018511",
  q10:       "entry.2007665370",
  q11:       "entry.346723911",
  q12:       "entry.1174770986",
  q13:       "entry.502239037",
  q14:       "entry.444849892",
} as const;

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const body = new URLSearchParams();
    body.set("fvv", "1");
    body.set("draftResponse", "[]");
    body.set("pageHistory", "0,1");
    body.set("fbzx", Date.now().toString());

    body.set(ENTRY_IDS.firstName, String(data.firstName ?? "").trim());
    body.set(ENTRY_IDS.email,     String(data.email ?? "").trim());
    body.set(ENTRY_IDS.q1,  String(data.q1  ?? ""));
    body.set(ENTRY_IDS.q2,  String(data.q2  ?? ""));
    body.set(ENTRY_IDS.q3,  String(data.q3  ?? ""));
    body.set(ENTRY_IDS.q4,  String(data.q4  ?? ""));
    body.set(ENTRY_IDS.q5,  String(data.q5  ?? ""));
    body.set(ENTRY_IDS.q6,  String(data.q6  ?? ""));
    body.set(ENTRY_IDS.q7,  String(data.q7  ?? ""));
    body.set(ENTRY_IDS.q8,  String(data.q8  ?? ""));
    body.set(ENTRY_IDS.q9,  String(data.q9  ?? ""));
    body.set(ENTRY_IDS.q10, String(data.q10 ?? ""));
    body.set(ENTRY_IDS.q11, String(data.q11 ?? ""));
    body.set(ENTRY_IDS.q12, String(data.q12 ?? ""));
    body.set(ENTRY_IDS.q13, String(data.q13 ?? ""));
    body.set(ENTRY_IDS.q14, String(data.q14 ?? ""));

    if (process.env.NODE_ENV === "development") {
      console.log("[submit-summit-readiness] payload:", {
        firstName: data.firstName,
        email: data.email,
        q1: data.q1,
        q14: data.q14,
      });
    }

    const res = await fetch(FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });

    if (res.status !== 200 && res.status !== 302) {
      console.error("Summit Readiness Form submit status:", res.status, res.statusText);
      return NextResponse.json(
        { error: "Form submission failed", status: res.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("submit-summit-readiness error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
