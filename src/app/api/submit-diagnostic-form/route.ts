import { NextResponse } from "next/server";

const FORM_URL =
  process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLSfdvHwTAuYDUZrqKntNaIcZbNM_RPothRiZgcMbwFPeb8Mx0A/formResponse";

const ENTRY_IDS = {
  firstName: "entry.1328606392",
  lastName: "entry.343152274",
  email: "entry.1362361142",
  boltScore: "entry.1002851429",
  co2Score: "entry.197086545",
  mbtScore: "entry.1392028128",
  lomZone: "entry.1358412920",
  romScore: "entry.1128018511",
  balloonScore: "entry.1115436622",
  age: "entry.1446995001",
  gender: "entry.2121457013",
  goalType: "entry.1174770986",
  goalDetail: "entry.887435060",
} as const;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const body = new URLSearchParams();
    body.set("fvv", "1");
    body.set("draftResponse", "[]");
    body.set("pageHistory", "0,1,2,3,4,5,6,7");
    body.set("fbzx", Date.now().toString());
    // Field order matches form pages: 1 identity, 2-6 tests, 7 balloon, 8 age/gender/goal’re not dropped
    body.set(ENTRY_IDS.firstName, String(data.firstName ?? "").trim());
    body.set(ENTRY_IDS.lastName, String(data.lastName ?? "").trim());
    body.set(ENTRY_IDS.email, String(data.email ?? "").trim());
    body.set(ENTRY_IDS.boltScore, String(data.boltScore ?? ""));
    body.set(ENTRY_IDS.co2Score, String(data.co2ttScore ?? ""));
    body.set(ENTRY_IDS.mbtScore, String(data.mbtSteps ?? ""));
    body.set(ENTRY_IDS.lomZone, String(data.lomZone ?? ""));
    body.set(ENTRY_IDS.romScore, "");
    body.set(ENTRY_IDS.balloonScore, String(data.balloon ?? "").trim() || "0");
    body.set(ENTRY_IDS.age, String(data.age ?? "").trim());
    body.set(ENTRY_IDS.gender, String(data.gender ?? "").trim());
    body.set(ENTRY_IDS.goalType, String(data.goalType ?? "").trim());
    body.set(ENTRY_IDS.goalDetail, String(data.goalDetail ?? "").trim());

    if (process.env.NODE_ENV === "development") {
      console.log("[submit-diagnostic-form] last 4 fields:", {
        age: data.age,
        gender: data.gender,
        goalType: data.goalType,
        goalDetail: (data.goalDetail ?? "").slice(0, 50),
      });
    }

    const res = await fetch(FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });

    if (res.status !== 200 && res.status !== 302) {
      console.error("Google Form submit status:", res.status, res.statusText);
      return NextResponse.json(
        { error: "Form submission failed", status: res.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("submit-diagnostic-form error:", error);
    return NextResponse.json(
      { error: "Form submission failed" },
      { status: 500 }
    );
  }
}
