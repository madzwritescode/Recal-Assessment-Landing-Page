import { NextResponse } from "next/server";

const VIEWFORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfdvHwTAuYDUZrqKntNaIcZbNM_RPothRiZgcMbwFPeb8Mx0A/viewform";

/**
 * GET /api/debug-form-ids
 * Fetches the live form HTML and extracts every entry.xxxxx ID in order.
 * Use this to see what IDs the form actually expects (especially for Age, Gender, Goal, Goal detail).
 */
export async function GET() {
  try {
    const res = await fetch(VIEWFORM_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FormIDChecker/1.0)" },
    });
    const html = await res.text();

    const nameAttrRegex = /name="(entry\.\d+)"/g;
    const anyEntryRegex = /entry\.(\d+)/g;
    const idsByName: string[] = [];
    const idsAny: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = nameAttrRegex.exec(html)) !== null) {
      if (!idsByName.includes(m[1])) idsByName.push(m[1]);
    }
    while ((m = anyEntryRegex.exec(html)) !== null) {
      const id = `entry.${m[1]}`;
      if (!idsAny.includes(id)) idsAny.push(id);
    }

    const expectedLastFour = [
      "entry.1446995001", // age
      "entry.2121457013", // gender
      "entry.1174770986", // goalType
      "entry.887435060",  // goalDetail
    ];

    return NextResponse.json({
      message: "Entry IDs: name attr (form fields) first, then any entry.xxxxx in page (incl. scripts). Compare expectedLastFour to fix submit.",
      entryIdsFromNameAttr: idsByName,
      entryIdsAnywhere: idsAny,
      countNameAttr: idsByName.length,
      countAnywhere: idsAny.length,
      expectedLastFour,
      lastFourMatchNameAttr: expectedLastFour.every((id) => idsByName.includes(id)),
      lastFourMatchAnywhere: expectedLastFour.every((id) => idsAny.includes(id)),
    });
  } catch (error) {
    console.error("debug-form-ids error:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}
