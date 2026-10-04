import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const room = await db.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const room = await db.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Join room action
    if (action === "join") {
      // If user is already the host
      if (room.hostUserId === user.id) {
        return NextResponse.json({ success: true, room, isHost: true });
      }

      // If room already has 2 people and this user is not the guest
      if (room.guestUserId && room.guestUserId !== user.id) {
        return NextResponse.json(
          { error: "Room is full. Maximum 2 viewers allowed." },
          { status: 403 }
        );
      }

      const updatedRoom = await db.joinRoom(code, user.id, user.name);

      // Notify host via signal
      db.addSignal({
        roomCode: code,
        senderId: user.id,
        recipientId: room.hostUserId,
        type: "join",
        payload: { guestId: user.id, guestName: user.name },
      });

      return NextResponse.json({ success: true, room: updatedRoom, isHost: false });
    }

    // Select video action (both host and guest can pick)
    if (action === "select-video") {
      const { videoId } = body;
      const video = await db.getVideoById(videoId);
      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      const updatedRoom = await db.selectRoomVideo(code, video);

      // Broadcast video selection signal
      db.addSignal({
        roomCode: code,
        senderId: user.id,
        type: "select-video",
        payload: { video },
      });

      return NextResponse.json({ success: true, room: updatedRoom });
    }

    // Start watch action
    if (action === "start-watch") {
      await db.updateRoomStatus(code, "watching");

      db.addSignal({
        roomCode: code,
        senderId: user.id,
        type: "start-watch",
        payload: { timestamp: Date.now() },
      });

      return NextResponse.json({ success: true });
    }

    // Playback state update
    if (action === "update-playback") {
      const { isPlaying, currentTime } = body;
      const updatedRoom = await db.updateRoomPlayback(code, {
        isPlaying,
        currentTime,
        updatedBy: user.id,
      });

      return NextResponse.json({ success: true, room: updatedRoom });
    }

    // Close / Delete Room action (Host ends the room completely)
    if (action === "close" || action === "delete") {
      if (room.hostUserId !== user.id) {
        return NextResponse.json(
          { error: "Only the room host can close and delete the watch party." },
          { status: 403 }
        );
      }

      await db.closeRoom(code, user.id);

      db.addSignal({
        roomCode: code,
        senderId: user.id,
        type: "leave",
        payload: { roomClosed: true, message: "Host closed this room." },
      });

      return NextResponse.json({
        success: true,
        message: "Room deleted and closed successfully.",
      });
    }

    // Leave room action
    if (action === "leave") {
      const isHost = room.hostUserId === user.id;
      if (isHost) {
        // If host leaves, the entire room is ended and deleted
        await db.closeRoom(code, user.id);
        db.addSignal({
          roomCode: code,
          senderId: user.id,
          type: "leave",
          payload: { roomClosed: true, message: "Host closed this room." },
        });
        return NextResponse.json({ success: true, roomClosed: true });
      } else {
        // If guest leaves, reset guest slot so host can wait or someone else can join
        const updatedRoom = await db.leaveRoom(code, user.id);
        db.addSignal({
          roomCode: code,
          senderId: user.id,
          recipientId: room.hostUserId,
          type: "leave",
          payload: { guestId: user.id, guestName: user.name },
        });
        return NextResponse.json({ success: true, room: updatedRoom, roomClosed: false });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Room action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await db.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostUserId !== user.id) {
      return NextResponse.json(
        { error: "Only the host can delete this room." },
        { status: 403 }
      );
    }

    await db.closeRoom(code, user.id);

    db.addSignal({
      roomCode: code,
      senderId: user.id,
      type: "leave",
      payload: { roomClosed: true, message: "Host closed this room." },
    });

    return NextResponse.json({ success: true, message: "Room deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
