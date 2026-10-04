import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await req.json();
    const { type, recipientId, payload } = body;

    if (!type) {
      return NextResponse.json({ error: "Signal type required" }, { status: 400 });
    }

    const signal = db.addSignal({
      roomCode: code,
      senderId: user.id,
      recipientId,
      type,
      payload,
    });

    return NextResponse.json({ success: true, signal });
  } catch (error: any) {
    console.error("Signal send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const since = parseInt(searchParams.get("since") || "0", 10);

    const signals = db.getSignalsForUser(code, user.id, since);

    return NextResponse.json({ signals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
