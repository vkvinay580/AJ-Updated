import { NextRequest, NextResponse } from "next/server";
import { apiError, sameOrigin } from "@/lib/api";
import { getAttendanceBranches } from "@/lib/attendance";

export async function GET(request: NextRequest) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  try {
    const branches = (await getAttendanceBranches())
      .filter(branch => branch.status)
      .map(branch => ({ branchId: branch.branchId, branchName: branch.branchName }));
    return NextResponse.json({ branches }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (caught) {
    return apiError(caught instanceof Error ? caught.message : "Unable to load the branch directory.", 502);
  }
}
