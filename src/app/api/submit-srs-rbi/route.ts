import { NextResponse } from "next/server";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSflCSHOxkssnM0IaHBpdbtwAOoxz7y61djtWNJGYQ4VTqiztA/formResponse";

const ENTRY_IDS = {
  firstName: "entry.1858000121",
  email: "entry.488433054",
  age: "entry.2039481145",
  gender: "entry.489393189",
  boltScore: "entry.1880815041",
  co2ttScore: "entry.2062254424",
  mbtSteps: "entry.837325677",
  lomZone: "entry.104410554",
  balloon: "entry.496427865",
  goal: "entry.357800876",
  climbStartDate: "entry.1823589595",
  score: "entry.1740075512",
  grade: "entry.556042623",
  badge: "entry.1504433363",
  strongest: "entry.2096312707",
  weakest: "entry.1078081452",
} as const;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const body = new URLSearchParams();
    body.set("fvv", "1");
    body.set("draftResponse", "[]");
    body.set("pageHistory", "0");
    body.set("fbzx", Date.now().toString());

    body.set(ENTRY_IDS.firstName, String(data.firstName ?? "").trim());
    body.set(ENTRY_IDS.email, String(data.email ?? "").trim());
    body.set(ENTRY_IDS.age, String(data.age ?? "").trim());
    body.set(ENTRY_IDS.gender, String(data.gender ?? "").trim());
    body.set(ENTRY_IDS.boltScore, String(data.boltScore ?? "").trim());
    body.set(ENTRY_IDS.co2ttScore, String(data.co2ttScore ?? "").trim());
    body.set(ENTRY_IDS.mbtSteps, String(data.mbtSteps ?? "").trim());
    body.set(ENTRY_IDS.lomZone, String(data.lomZone ?? "").trim());
    body.set(ENTRY_IDS.balloon, String(data.balloon ?? "").trim());

    // Combine Goal Type & Detail into Question 10 (Your Goal)
    const goalType = String(data.goalType ?? "").trim();
    const goalDetail = String(data.goalDetail ?? "").trim();
    const combinedGoal = goalDetail
      ? (goalType ? `${goalType} - ${goalDetail}` : goalDetail)
      : goalType;
    body.set(ENTRY_IDS.goal, combinedGoal);

    // Only set climbStartDate if provided and matches valid date pattern (YYYY-MM-DD)
    // Avoids Google Forms Type 9 Date field validation crash
    const rawDate = String(data.climbStartDate ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      body.set(ENTRY_IDS.climbStartDate, rawDate);
    }

    body.set(ENTRY_IDS.score, String(data.score ?? ""));
    body.set(ENTRY_IDS.grade, String(data.grade ?? "").trim());
    body.set(ENTRY_IDS.badge, String(data.badge ?? "").trim());
    body.set(ENTRY_IDS.strongest, String(data.strongest ?? "").trim());
    body.set(ENTRY_IDS.weakest, String(data.weakest ?? "").trim());

    const res = await fetch(FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });

    if (res.status !== 200 && res.status !== 302 && res.status !== 303) {
      console.error("[submit-srs-rbi] Google Form error status:", res.status, res.statusText);
      return NextResponse.json(
        { error: "Google Form submission failed", status: res.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[submit-srs-rbi] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
