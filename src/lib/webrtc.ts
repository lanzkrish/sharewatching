"use client";

import { PlaybackAction } from "@/types";

// Standard STUN and fallback free TURN servers to guarantee cross-device NAT traversal
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Open relay TURN server for devices behind restrictive symmetric NAT
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelay",
    credential: "openrelay",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelay",
    credential: "openrelay",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelay",
    credential: "openrelay",
  },
];

// Allow overriding via environment variables
if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_TURN_URL) {
  DEFAULT_ICE_SERVERS.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
    credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || "",
  });
}

export interface WebRTCHooks {
  onRemoteStream?: (stream: MediaStream) => void;
  onDataChannelMessage?: (action: PlaybackAction) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onSignalNeeded?: (type: "offer" | "answer" | "ice-candidate", payload: any) => void;
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private hooks: WebRTCHooks = {};
  private isInitiator = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(hooks: WebRTCHooks) {
    this.hooks = hooks;
  }

  async initializeLocalMedia(video = true, audio = true): Promise<MediaStream | null> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 24 },
            }
          : false,
        audio: audio,
      });

      this.localStream = stream;

      // If peer connection is already created, attach newly obtained tracks
      if (this.pc) {
        const senders = this.pc.getSenders();
        stream.getTracks().forEach((track) => {
          const existingSender = senders.find((s) => s.track?.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track);
          } else {
            try {
              this.pc?.addTrack(track, stream);
            } catch (e) {
              console.warn("[WebRTC] addTrack warning:", e);
            }
          }
        });
      }

      return stream;
    } catch (err) {
      console.warn("Could not acquire webcam/microphone:", err);
      return null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  setupPeerConnection(isInitiator: boolean): RTCPeerConnection {
    // If peer connection exists and is healthy, keep it and ensure initiator state / DataChannel
    if (this.pc && this.pc.signalingState !== "closed") {
      this.isInitiator = isInitiator;
      if (isInitiator && !this.dataChannel) {
        try {
          this.dataChannel = this.pc.createDataChannel("sync-channel", {
            ordered: true,
          });
          this.setupDataChannel(this.dataChannel);
        } catch (e) {
          console.warn("[WebRTC] createDataChannel warn:", e);
        }
      }
      return this.pc;
    }

    this.isInitiator = isInitiator;
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }

    this.pendingCandidates = [];

    this.pc = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: 4,
    });

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.pc) {
          try {
            this.pc.addTrack(track, this.localStream);
          } catch (e) {
            console.warn("[WebRTC] Error adding local track to pc:", e);
          }
        }
      });
    }

    // Remote tracks listener - resilient across all browser implementations
    this.pc.ontrack = (event) => {
      console.log(`[WebRTC] ✅ Received remote track: kind=${event.track.kind}, id=${event.track.id}`);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      // Add track to remoteStream if not already present
      if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }

      const emitStream = () => {
        if (this.hooks.onRemoteStream && this.remoteStream) {
          // Provide fresh MediaStream instance so React state detection (Object.is) triggers re-render
          this.hooks.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
        }
      };

      event.track.onunmute = () => {
        console.log(`[WebRTC] Remote track unmuted: kind=${event.track.kind}`);
        emitStream();
      };

      emitStream();
    };

    // ICE Candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.hooks.onSignalNeeded) {
        this.hooks.onSignalNeeded("ice-candidate", event.candidate);
      }
    };

    // Connection state
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        console.log(`[WebRTC] PeerConnection state: ${this.pc.connectionState}`);
        if (this.hooks.onConnectionStateChange) {
          this.hooks.onConnectionStateChange(this.pc.connectionState);
        }
      }
    };

    // ICE Connection state
    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) {
        console.log(`[WebRTC] ICE Connection state: ${this.pc.iceConnectionState}`);
        if (this.hooks.onIceConnectionStateChange) {
          this.hooks.onIceConnectionStateChange(this.pc.iceConnectionState);
        }
      }
    };

    if (isInitiator) {
      // Host creates DataChannel
      this.dataChannel = this.pc.createDataChannel("sync-channel", {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      // Guest listens for DataChannel
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }

    return this.pc;
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      try {
        const action: PlaybackAction = JSON.parse(event.data);
        if (this.hooks.onDataChannelMessage) {
          this.hooks.onDataChannelMessage(action);
        }
      } catch (err) {
        console.error("Failed to parse datachannel message", err);
      }
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc || this.pc.signalingState === "closed") {
      this.setupPeerConnection(true);
    }
    if (!this.pc) return null;

    this.isInitiator = true;

    // Ensure DataChannel exists
    if (!this.dataChannel) {
      try {
        this.dataChannel = this.pc.createDataChannel("sync-channel", {
          ordered: true,
        });
        this.setupDataChannel(this.dataChannel);
      } catch (e) {
        console.warn("[WebRTC] createDataChannel warn in createOffer:", e);
      }
    }

    // Ensure local tracks are loaded before creating offer
    if (!this.localStream) {
      await this.initializeLocalMedia(true, true);
    }

    // Attach all local tracks to peer connection
    if (this.localStream && this.pc) {
      const senders = this.pc.getSenders();
      this.localStream.getTracks().forEach((track) => {
        const existing = senders.find((s) => s.track?.id === track.id || s.track?.kind === track.kind);
        if (!existing) {
          try {
            this.pc?.addTrack(track, this.localStream!);
          } catch (e) {
            console.warn("[WebRTC] addTrack warn in createOffer:", e);
          }
        }
      });
    }

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc || this.pc.signalingState === "closed") {
      this.setupPeerConnection(false);
    }
    if (!this.pc) return null;

    this.isInitiator = false;

    // Ensure guest local media is acquired so answer contains guest's camera and mic tracks!
    if (!this.localStream) {
      await this.initializeLocalMedia(true, true);
    }

    // Attach all guest local tracks to peer connection so answer contains audio & video
    if (this.localStream && this.pc) {
      const senders = this.pc.getSenders();
      this.localStream.getTracks().forEach((track) => {
        const existing = senders.find((s) => s.track?.id === track.id || s.track?.kind === track.kind);
        if (!existing) {
          try {
            this.pc?.addTrack(track, this.localStream!);
          } catch (e) {
            console.warn("[WebRTC] addTrack warn in handleOffer:", e);
          }
        }
      });
    }

    if (this.pc.signalingState !== "stable") {
      try {
        await Promise.all([
          this.pc.setLocalDescription({ type: "rollback" }),
          this.pc.setRemoteDescription(new RTCSessionDescription(offer)),
        ]);
      } catch {
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      }
    } else {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    }

    await this.flushPendingCandidates();

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    if (this.pc.signalingState !== "have-local-offer") {
      console.warn(`[WebRTC] Ignoring answer in unexpected state: ${this.pc.signalingState}`);
      return;
    }
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this.flushPendingCandidates();
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate || !candidate.candidate) return;

    if (!this.pc || !this.pc.remoteDescription) {
      // Queue candidate until remote description is set
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn("Error adding received ICE candidate:", err);
    }
  }

  private async flushPendingCandidates() {
    if (!this.pc || !this.pc.remoteDescription) return;

    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate && candidate.candidate) {
        try {
          await this.pc.addIceCandidate(candidate);
        } catch (err) {
          console.warn("Error flushing pending ICE candidate:", err);
        }
      }
    }
  }

  async restartIce(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc || !this.isInitiator) return null;
    try {
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      return offer;
    } catch (e) {
      console.warn("ICE restart failed:", e);
      return null;
    }
  }

  sendAction(action: PlaybackAction): boolean {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(action));
      return true;
    }
    return false;
  }

  destroy() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
  }
}
