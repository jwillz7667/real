"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhoneNumber, formatDuration } from "@/lib/utils";
import { Phone, PhoneOff, Circle, Loader2 } from "lucide-react";

export function CallControls() {
  const {
    call,
    config,
    setPhoneNumber,
    setCallStatus,
    startCall,
    endCall,
    setRecording,
    updateCallDuration,
    addEvent,
  } = useStore();

  const [isInitiating, setIsInitiating] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (call.callStatus === "in-progress" && call.callStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor(
          (Date.now() - call.callStartTime!.getTime()) / 1000
        );
        updateCallDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [call.callStatus, call.callStartTime, updateCallDuration]);

  const connectWebSocket = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    const ws = new WebSocket(`${wsUrl}/events`);

    ws.onopen = () => {
      addEvent({
        source: "system",
        direction: "incoming",
        eventType: "websocket.connected",
        payload: {},
        callId: call.currentCallId || "",
        summary: "Connected to event stream",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "call.status") {
          setCallStatus(data.status);
          if (data.status === "completed" || data.status === "failed") {
            endCall();
          }
        }

        addEvent({
          source: data.source || "system",
          direction: data.direction || "incoming",
          eventType: data.type || data.eventType,
          payload: data.payload || data,
          callId: data.callId || call.currentCallId || "",
          summary: data.summary,
        });
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      addEvent({
        source: "system",
        direction: "incoming",
        eventType: "websocket.disconnected",
        payload: {},
        callId: call.currentCallId || "",
        summary: "Disconnected from event stream",
      });
    };

    ws.onerror = () => {
      addEvent({
        source: "system",
        direction: "incoming",
        eventType: "websocket.error",
        payload: {},
        callId: call.currentCallId || "",
        summary: "WebSocket connection error",
      });
    };

    setWsConnection(ws);
    return ws;
  }, [addEvent, call.currentCallId, setCallStatus, endCall]);

  const handleCall = async () => {
    if (!call.phoneNumber || call.phoneNumber.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid phone number");
      return;
    }

    setIsInitiating(true);

    try {
      const ws = connectWebSocket();

      const response = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: call.phoneNumber.startsWith("+")
            ? call.phoneNumber
            : `+1${call.phoneNumber.replace(/\D/g, "")}`,
          config,
          recordCall: call.isRecording,
        }),
      });

      const data = await response.json();

      if (data.success) {
        startCall(data.callId, data.twilioCallSid);
        addEvent({
          source: "system",
          direction: "outgoing",
          eventType: "call.initiated",
          payload: { callId: data.callId, twilioCallSid: data.twilioCallSid },
          callId: data.callId,
          summary: `Calling ${call.phoneNumber}`,
        });
      } else {
        throw new Error(data.error || "Failed to initiate call");
      }
    } catch (error) {
      console.error("Call failed:", error);
      addEvent({
        source: "system",
        direction: "incoming",
        eventType: "call.error",
        payload: { error: String(error) },
        callId: "",
        summary: `Call failed: ${error}`,
      });
      alert(`Failed to initiate call: ${error}`);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleHangup = async () => {
    if (!call.currentCallId) return;

    try {
      await fetch("/api/calls/hangup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.currentCallId }),
      });

      addEvent({
        source: "system",
        direction: "outgoing",
        eventType: "call.hangup",
        payload: { callId: call.currentCallId },
        callId: call.currentCallId,
        summary: "Call ended by user",
      });

      endCall();
      wsConnection?.close();
      setWsConnection(null);
    } catch (error) {
      console.error("Hangup failed:", error);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getStatusColor = () => {
    switch (call.callStatus) {
      case "idle":
        return "bg-zinc-400";
      case "initiated":
      case "ringing":
        return "bg-amber-500 animate-pulse";
      case "in-progress":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "failed":
      case "busy":
      case "no-answer":
        return "bg-red-500";
      default:
        return "bg-zinc-400";
    }
  };

  const getStatusText = () => {
    switch (call.callStatus) {
      case "idle":
        return "Ready";
      case "initiated":
        return "Initiating...";
      case "ringing":
        return "Ringing...";
      case "in-progress":
        return `Connected ${formatDuration(call.callDuration)}`;
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "busy":
        return "Busy";
      case "no-answer":
        return "No Answer";
      default:
        return "Unknown";
    }
  };

  const isCallActive =
    call.callStatus === "initiated" ||
    call.callStatus === "ringing" ||
    call.callStatus === "in-progress";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Call Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="phone" className="text-sm">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={call.phoneNumber}
            onChange={handlePhoneChange}
            disabled={isCallActive}
            className="mt-1.5 text-lg"
          />
        </div>

        <div className="flex gap-2">
          {!isCallActive ? (
            <Button
              onClick={handleCall}
              disabled={isInitiating || !call.phoneNumber}
              className="flex-1"
              variant="success"
              size="lg"
            >
              {isInitiating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Phone className="mr-2 h-5 w-5" />
              )}
              Call
            </Button>
          ) : (
            <Button
              onClick={handleHangup}
              className="flex-1"
              variant="destructive"
              size="lg"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              Hangup
            </Button>
          )}

          <Button
            variant={call.isRecording ? "destructive" : "outline"}
            size="lg"
            onClick={() => setRecording(!call.isRecording)}
            disabled={isCallActive}
          >
            <Circle
              className={`h-4 w-4 ${call.isRecording ? "fill-current" : ""}`}
            />
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
            <span className="font-medium">{getStatusText()}</span>
          </div>
          {call.isRecording && isCallActive && (
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
          )}
        </div>

        {isCallActive && call.phoneNumber && (
          <p className="text-sm text-zinc-500 text-center">{call.phoneNumber}</p>
        )}
      </CardContent>
    </Card>
  );
}
