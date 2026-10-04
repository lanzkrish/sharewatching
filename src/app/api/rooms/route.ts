import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Generate unique 5-digit code
function generate5DigitCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try finding unused 5-digit code
    let code = generate5DigitCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.getRoomByCode(code);
      if (!existing || existing.status === "ended") break;
      code = generate5DigitCode();
      attempts++;
    }

    const room = await db.createRoom({
      code,
      hostUserId: user.id,
      hostName: user.name,
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Create room error:", error);
    return NextResponse.json({ error: error.message || "Failed to create room" }, { status: 500 });
  }
}
