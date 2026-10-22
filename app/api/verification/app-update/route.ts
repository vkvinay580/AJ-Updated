import { NextResponse } from "next/server";
import { VERIFICATION_APP_RELEASE } from "@/lib/verification-app-release";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      latestVersionName: VERIFICATION_APP_RELEASE.versionName,
      latestVersionCode: VERIFICATION_APP_RELEASE.versionCode,
      minimumVersionCode: VERIFICATION_APP_RELEASE.minimumVersionCode,
      downloadUrl: VERIFICATION_APP_RELEASE.downloadUrl,
      message: VERIFICATION_APP_RELEASE.message,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

