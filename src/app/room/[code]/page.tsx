"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import MeetConferenceBar from "@/components/MeetConferenceBar";
import ChatSidebar, { ChatMessage } from "@/components/ChatSidebar";
import WatchTogetherModal from "@/components/WatchTogetherModal";
import { WebRTCManager } from "@/lib/webrtc";
import {
  getSocket,
  joinSocketRoom,
  sendSocketSignal,
  sendSocketVideoAction,
  sendSocketSelectVideo,
  sendSocketChatMessage,
  sendSocketCloseRoom,
  disconnectSocket,
} from "@/lib/socket";
import { IRoom, IVideo, PlaybackAction, ISignalMessage } from "@/types";
import { fetchWithAuth } from "@/lib/api";
import {
  Film,
  Users,
  Copy,
  Check,
  Tv,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trash2,
  LogOut,
  X,
} from "lucide-react";
import Link from "next/link";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code;

  const { user, loading } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<IRoom | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebRTC & Media States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);

  // Real-time Playback Sync
  const [incomingAction, setIncomingAction] = useState<PlaybackAction | null>(null);

  // In-room Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Signaling state
  const lastSignalTime = useRef<number>(0);
  const lastPlaybackTime = useRef<number>(0);
  const hasInitiatedCall = useRef(false);

  // Exit & Room Termination Dialog States
  const [showExitModal, setShowExitModal] = useState(false);
  const [isClosingRoom, setIsClosingRoom] = useState(false);
  const [isRoomTerminated, setIsRoomTerminated] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState("");

  const isHost = room?.hostUserId === user?.id;

  // Intercept Browser Tab Close / Reload to prompt user
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = isHost
        ? "Leaving this page will permanently close the watch party and delete the room code."
        : "Are you sure you want to leave this watch party?";

      if (isHost) {
        sendSocketCloseRoom(roomCode, "Host closed the browser tab.");
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(
            `/api/rooms/${roomCode}`,
            new Blob([JSON.stringify({ action: "close" })], { type: "application/json" })
          );
        }
      }
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isHost, roomCode]);

  // Intercept Browser Back Button to prompt user with modal
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      // Re-push state so user doesn't immediately navigate away, show confirmation modal
      window.history.pushState(null, "", window.location.href);
      setShowExitModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check auth
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=/room/${roomCode}`);
    }
  }, [user, loading, router, roomCode]);

  // Load and join room
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadAndJoin() {
      try {
        const joinRes = await fetchWithAuth(`/api/rooms/${roomCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join" }),
        });

        const joinData = await joinRes.json();
        if (!joinRes.ok) {
          throw new Error(joinData.error || "Failed to join room");
        }

        if (isMounted) {
          setRoom(joinData.room);
          setLoadingRoom(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Could not load room");
          setLoadingRoom(false);
        }
      }
    }

    loadAndJoin();

    return () => {
      isMounted = false;
    };
  }, [user, roomCode]);

  // Initialize WebRTC and Local Camera/Mic
  useEffect(() => {
    if (!user || !room) return;

    const isHost = room.hostUserId === user.id;

    const rtc = new WebRTCManager({
      onRemoteStream: (stream) => {
        console.log("[WebRTC] Remote video stream received!");
        setRemoteStream(stream);
      },
      onDataChannelMessage: (action) => {
        handleReceivedAction(action);
      },
      onSignalNeeded: async (type, payload) => {
        const recipientId = isHost ? room.guestUserId : room.hostUserId;
        // 1. Fast path: Send over Socket.IO (<10ms)
        sendSocketSignal(roomCode, recipientId, type, payload);

        // 2. Slow path: Fallback HTTP signaling
        try {
          await fetchWithAuth(`/api/rooms/${roomCode}/signal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              recipientId,
              payload,
            }),
          });
        } catch {
          // Handled by socket
        }
      },
    });

    webrtcManager.current = rtc;

    // Start local webcam & microphone
    rtc.initializeLocalMedia(true, true).then((stream) => {
      if (stream) {
        setLocalStream(stream);
        rtc.setupPeerConnection(isHost);

        // If host and guest is already present, create offer immediately
        if (isHost && room.guestUserId && !hasInitiatedCall.current) {
          hasInitiatedCall.current = true;
          rtc.createOffer().then((offer) => {
            if (offer) {
              sendSocketSignal(roomCode, room.guestUserId, "offer", offer);
              fetchWithAuth(`/api/rooms/${roomCode}/signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "offer",
                  recipientId: room.guestUserId,
                  payload: offer,
                }),
              }).catch(() => {});
            }
          });
        }
      }
    });

    return () => {
      rtc.destroy();
      webrtcManager.current = null;
    };
  }, [user, room?.hostUserId, room?.guestUserId, roomCode]);

  // Real-Time Socket.IO Listeners (Instant WebRTC Signaling, Playback Sync & Chat)
  useEffect(() => {
    if (!user || !room) return;

    const isHost = room.hostUserId === user.id;
    joinSocketRoom(roomCode, user.id, user.name, isHost);

    const socket = getSocket();
    if (!socket) return;

    const onSocketSignal = (data: { senderId: string; type: any; payload: any }) => {
      handleIncomingSignal(
        {
          id: String(Date.now()),
          roomCode,
          senderId: data.senderId,
          type: data.type,
          payload: data.payload,
          createdAt: Date.now(),
        },
        isHost
      );
    };

    const onSocketVideoAction = (data: { action: PlaybackAction }) => {
      if (data && data.action) {
        handleReceivedAction(data.action);
      }
    };

    const onSocketSelectVideo = (data: { video: IVideo }) => {
      if (data && data.video) {
        setRoom((prev) => (prev ? { ...prev, selectedVideo: data.video } : null));
        addChatMessage({
          id: String(Date.now()),
          sender: "System",
          text: `Selected video changed to "${data.video.title}"`,
          isSystem: true,
          timestamp: Date.now(),
        });
      }
    };

    const onSocketUserJoined = (data: { userId: string; username: string }) => {
      addChatMessage({
        id: String(Date.now()),
        sender: "System",
        text: `${data.username} joined the party!`,
        isSystem: true,
        timestamp: Date.now(),
      });

      // Host triggers WebRTC offer immediately to newly joined peer
      if (isHost && webrtcManager.current && !hasInitiatedCall.current) {
        hasInitiatedCall.current = true;
        webrtcManager.current.createOffer().then((offer) => {
          if (offer) {
            sendSocketSignal(roomCode, data.userId, "offer", offer);
            fetchWithAuth(`/api/rooms/${roomCode}/signal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "offer",
                recipientId: data.userId,
                payload: offer,
              }),
            }).catch(() => {});
          }
        });
      }
    };

    const onSocketUserLeft = (data: { username: string }) => {
      addChatMessage({
        id: String(Date.now()),
        sender: "System",
        text: `${data.username} left the party.`,
        isSystem: true,
        timestamp: Date.now(),
      });
      setRemoteStream(null);
      hasInitiatedCall.current = false;
    };

    const onSocketChatMessage = (msg: any) => {
      addChatMessage({
        id: msg.id || String(Date.now()),
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp || Date.now(),
      });
    };

    const onSocketRoomClosed = (data: { roomCode: string; message?: string }) => {
      console.log("[Socket.IO] Room closed by host:", data);
      setIsRoomTerminated(true);
      setTerminationMessage(
        data?.message || "The host has closed this watch party and deleted the room code."
      );
      webrtcManager.current?.destroy();
      disconnectSocket();
    };

    socket.on("signal", onSocketSignal);
    socket.on("video-action", onSocketVideoAction);
    socket.on("select-video", onSocketSelectVideo);
    socket.on("user-joined", onSocketUserJoined);
    socket.on("user-left", onSocketUserLeft);
    socket.on("chat-message", onSocketChatMessage);
    socket.on("room-closed", onSocketRoomClosed);

    return () => {
      socket.off("signal", onSocketSignal);
      socket.off("video-action", onSocketVideoAction);
      socket.off("select-video", onSocketSelectVideo);
      socket.off("user-joined", onSocketUserJoined);
      socket.off("user-left", onSocketUserLeft);
      socket.off("chat-message", onSocketChatMessage);
      socket.off("room-closed", onSocketRoomClosed);
    };
  }, [user, room?.hostUserId, roomCode]);

  // Polling Fallback for Room Metadata & Signals (WebRTC, sync actions, chat)
  useEffect(() => {
    if (!user || !room) return;

    const isHost = room.hostUserId === user.id;
    const handledSignalIds = new Set<string>();

    const interval = setInterval(async () => {
      try {
        // 1. Poll room updates
        const roomRes = await fetchWithAuth(`/api/rooms/${roomCode}`);
        if (roomRes.status === 404 && !isHost) {
          setIsRoomTerminated(true);
          setTerminationMessage("The host has closed this watch party. The room code has been deleted.");
          webrtcManager.current?.destroy();
          disconnectSocket();
          return;
        }

        if (roomRes.ok) {
          const data = await roomRes.json();
          const latestRoom: IRoom = data.room;
          setRoom(latestRoom);

          // If partner updated playback in database, sync incoming action
          if (
            latestRoom.playbackState &&
            latestRoom.playbackState.updatedBy !== user.id &&
            latestRoom.playbackState.updatedAt > lastPlaybackTime.current
          ) {
            lastPlaybackTime.current = latestRoom.playbackState.updatedAt;
            setIncomingAction({
              type: latestRoom.playbackState.isPlaying ? "PLAY" : "PAUSE",
              currentTime: latestRoom.playbackState.currentTime,
              timestamp: latestRoom.playbackState.updatedAt || Date.now(),
            });
          }

          if (
            isHost &&
            latestRoom.guestUserId &&
            !hasInitiatedCall.current &&
            webrtcManager.current
          ) {
            hasInitiatedCall.current = true;
            webrtcManager.current.createOffer().then((offer) => {
              if (offer) {
                sendSocketSignal(roomCode, latestRoom.guestUserId, "offer", offer);
                fetchWithAuth(`/api/rooms/${roomCode}/signal`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "offer",
                    recipientId: latestRoom.guestUserId,
                    payload: offer,
                  }),
                }).catch(() => {});
              }
            });
          }
        }

        // 2. Poll signals as fallback (WebRTC offers/answers, ICE candidates, sync actions, chat)
        const signalRes = await fetchWithAuth(
          `/api/rooms/${roomCode}/signal?since=${lastSignalTime.current}`
        );
        if (signalRes.ok) {
          const signalData = await signalRes.json();
          const signals: ISignalMessage[] = signalData.signals || [];
          for (const sig of signals) {
            if (handledSignalIds.has(sig.id)) continue;
            handledSignalIds.add(sig.id);
            if (sig.createdAt > lastSignalTime.current) {
              lastSignalTime.current = sig.createdAt;
            }
            if (sig.type === "leave" && sig.payload?.roomClosed && !isHost) {
              setIsRoomTerminated(true);
              setTerminationMessage(
                sig.payload?.message || "The host has closed this watch party. The room code has been deleted."
              );
              webrtcManager.current?.destroy();
              disconnectSocket();
              return;
            }
            handleIncomingSignal(sig, isHost);
          }
        }
      } catch (err) {
        // Silent fallback polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, room?.hostUserId, roomCode]);

  // Process incoming WebRTC & Sync signals
  const handleIncomingSignal = async (signal: ISignalMessage, isHost: boolean) => {
    const rtc = webrtcManager.current;
    if (!rtc) return;

    switch (signal.type) {
      case "offer":
        if (!isHost) {
          const answer = await rtc.handleOffer(signal.payload);
          if (answer) {
            sendSocketSignal(roomCode, signal.senderId, "answer", answer);
            fetchWithAuth(`/api/rooms/${roomCode}/signal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "answer",
                recipientId: signal.senderId,
                payload: answer,
              }),
            }).catch(() => {});
          }
        }
        break;

      case "answer":
        if (isHost) {
          await rtc.handleAnswer(signal.payload);
        }
        break;

      case "ice-candidate":
        await rtc.handleIceCandidate(signal.payload);
        break;

      case "sync-action":
        handleReceivedAction(signal.payload);
        break;

      case "chat":
        if (signal.payload) {
          addChatMessage({
            id: signal.id,
            sender: signal.payload.sender || "Partner",
            text: signal.payload.text || signal.payload.message || "",
            timestamp: signal.createdAt,
          });
        }
        break;

      case "select-video":
        if (signal.payload.video) {
          setRoom((prev) => (prev ? { ...prev, selectedVideo: signal.payload.video } : null));
          addChatMessage({
            id: String(Date.now()),
            sender: "System",
            text: `Selected video changed to "${signal.payload.video.title}"`,
            isSystem: true,
            timestamp: Date.now(),
          });
        }
        break;
    }
  };

  // Dispatch sync action to peer (via WebRTC DataChannel + Socket.IO + API fallback)
  const handleSendAction = (action: PlaybackAction) => {
    const rtc = webrtcManager.current;
    // 1. P2P DataChannel (<5ms)
    rtc?.sendAction(action);

    // 2. Socket.IO Broadcast (<15ms)
    sendSocketVideoAction(roomCode, action);

    // 3. Fallback to API if peer is disconnected
    if (user && room) {
      const recipientId = room.hostUserId === user.id ? room.guestUserId : room.hostUserId;
      fetchWithAuth(`/api/rooms/${roomCode}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sync-action",
          recipientId,
          payload: action,
        }),
      }).catch(() => {});
    }

    // Persist playback state to room in DB
    if (action.type === "PLAY" || action.type === "PAUSE" || action.type === "SEEK") {
      fetchWithAuth(`/api/rooms/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-playback",
          isPlaying: action.type === "PLAY",
          currentTime: action.currentTime,
        }),
      }).catch(() => {});
    }
  };

  // Handle incoming playback sync action
  const handleReceivedAction = (action: PlaybackAction) => {
    setIncomingAction(action);

    if (action.type === "CHAT") {
      addChatMessage({
        id: String(Date.now() + Math.random()),
        sender: action.sender,
        text: action.message,
        timestamp: action.timestamp,
      });
      if (!isChatOpen) {
        setUnreadChatCount((prev) => prev + 1);
      }
    } else if (action.type === "CACHE_STATUS") {
      addChatMessage({
        id: String(Date.now()),
        sender: "System",
        text: `Partner cached 100% locally for zero-buffer playback!`,
        isSystem: true,
        timestamp: Date.now(),
      });
    }
  };

  const addChatMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  };

  const handleSendMessage = (text: string) => {
    if (!user) return;
    const chatMsg = {
      id: String(Date.now()),
      sender: user.name,
      text,
      timestamp: Date.now(),
    };
    sendSocketChatMessage(roomCode, chatMsg);
    handleSendAction({
      type: "CHAT",
      message: text,
      sender: user.name,
      timestamp: Date.now(),
    });
    addChatMessage({
      id: String(Date.now()),
      sender: "You",
      text,
      timestamp: Date.now(),
    });
  };

  const handleConfirmExit = async () => {
    if (!user || !room) return;
    setIsClosingRoom(true);

    try {
      if (isHost) {
        // Host ends and permanently deletes the room
        sendSocketCloseRoom(roomCode, "Host closed this watch party.");
        await fetchWithAuth(`/api/rooms/${roomCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "close" }),
        }).catch(() => {});
      } else {
        // Guest leaves the room
        await fetchWithAuth(`/api/rooms/${roomCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        }).catch(() => {});
      }
    } finally {
      webrtcManager.current?.destroy();
      disconnectSocket();
      router.push("/dashboard");
    }
  };

  const handleLeaveRoom = () => {
    setShowExitModal(true);
  };

  if (loadingRoom || !user) {
    return (
      <div className="min-h-screen bg-cinema-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm text-slate-400">Connecting to watch party {roomCode}...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-cinema-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-cinema-900 border border-slate-800 p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Cannot Enter Room</h2>
          <p className="text-xs text-slate-400">{error || "Room is full or no longer exists."}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const partnerName = isHost ? room.guestName || "" : room.hostName;

  return (
    <div className="min-h-screen bg-cinema-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col">
        {/* Room Header Info */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowExitModal(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isHost ? "Close Watch Party" : "Leave Watch Party"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {room.selectedVideo?.title || "Co-Watching Room"}
                </h1>
                <span className="font-mono text-xs font-bold text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-md">
                  #{roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {partnerName ? `Watching with ${partnerName}` : "Waiting for partner to join..."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-brand-400" />
              <span>{room.guestUserId ? "2/2 Viewers" : "1/2 Viewers"}</span>
            </div>
          </div>
        </div>

        {/* Video Player (Main View) */}
        <div className="flex-1 flex flex-col justify-center">
          {room.selectedVideo ? (
            <VideoPlayer
              video={room.selectedVideo as IVideo}
              roomCode={roomCode}
              isHost={isHost}
              onSendAction={handleSendAction}
              incomingAction={incomingAction}
            />
          ) : (
            <div className="aspect-video bg-cinema-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Film className="w-12 h-12 text-slate-600" />
              <h2 className="text-base font-semibold text-white">No Video Selected Yet</h2>
              <p className="text-xs text-slate-400 max-w-sm">
                Pick a video from your portfolio or your partner&apos;s portfolio to begin watching.
              </p>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-medium"
              >
                Go to Portfolio
              </Link>
            </div>
          )}
        </div>

        {/* Google Meet-Style Bottom Conference Bar (Dual Camera Feeds + Controls) */}
        <MeetConferenceBar
          localStream={localStream}
          remoteStream={remoteStream}
          currentUser={user}
          partnerName={partnerName}
          isHost={isHost}
          roomCode={roomCode}
          onToggleMic={(enabled) => webrtcManager.current?.toggleAudio(enabled)}
          onToggleCam={(enabled) => webrtcManager.current?.toggleVideo(enabled)}
          onToggleChat={() => {
            setIsChatOpen(!isChatOpen);
            setUnreadChatCount(0);
          }}
          onLeaveRoom={handleLeaveRoom}
          unreadCount={unreadChatCount}
        />
      </main>

      {/* In-Room Chat Drawer */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentUserName={user.name}
      />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-cinema-900 border border-slate-800 p-6 shadow-2xl shadow-black/80 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-3 rounded-2xl ${
                    isHost ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {isHost ? <Trash2 className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isHost ? "Close Watch Party?" : "Leave Watch Party?"}
                  </h3>
                  <span className="font-mono text-xs font-bold text-brand-300">
                    Room #{roomCode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowExitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
              {isHost ? (
                <>
                  <p className="font-semibold text-red-300 flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Warning: Room code will be permanently deleted</span>
                  </p>
                  <p className="text-slate-400">
                    As the host, leaving will immediately end this watch party. The room code{" "}
                    <strong className="text-white">#{roomCode}</strong> will be erased from the
                    server and cannot be used again by you or your partner.
                  </p>
                </>
              ) : (
                <p className="text-slate-400">
                  Are you sure you want to leave this watch party? You can rejoin later as long as the
                  host keeps the room open.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                disabled={isClosingRoom}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel (Stay in Room)
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                disabled={isClosingRoom}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-lg ${
                  isHost
                    ? "bg-red-600 hover:bg-red-500 shadow-red-600/30"
                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                }`}
              >
                {isClosingRoom ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isHost ? "Deleting Room..." : "Leaving..."}</span>
                  </>
                ) : (
                  <>
                    {isHost ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                    <span>{isHost ? "Close & Delete Room" : "Leave Party"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Terminated by Host Modal (Shown to guest when host closed the room) */}
      {isRoomTerminated && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-cinema-900 border border-red-500/30 p-6 shadow-2xl shadow-red-950/40 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Watch Party Ended</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {terminationMessage ||
                `The host has ended this watch party. Room code #${roomCode} has expired and can no longer be used.`}
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-brand-600/30"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
