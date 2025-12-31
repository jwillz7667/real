import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "http";
import { parse } from "url";

const PORT = parseInt(process.env.WEBSOCKET_PORT || "3001", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime";
const MODEL = "gpt-realtime";

interface CallSession {
  callId: string;
  streamSid: string | null;
  twilioWs: WebSocket;
  openaiWs: WebSocket | null;
  config: SessionConfig;
  isRecording: boolean;
  recordingBuffer: {
    caller: Buffer[];
    ai: Buffer[];
  };
  eventClients: Set<WebSocket>;
  inputTokens: number;
  outputTokens: number;
  startTime: Date;
}

interface SessionConfig {
  voice: string;
  instructions: string;
  turnDetection: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    eagerness?: string;
    create_response: boolean;
    interrupt_response: boolean;
  };
  inputAudioNoiseReduction: { type: string } | null;
  temperature: number;
  maxResponseOutputTokens: number | string;
}

const sessions = new Map<string, CallSession>();
const eventClients = new Set<WebSocket>();

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data) : "");
}

function broadcastEvent(
  callId: string,
  event: {
    type: string;
    source: string;
    direction: string;
    payload?: unknown;
    summary?: string;
  }
) {
  const message = JSON.stringify({
    ...event,
    callId,
    timestamp: new Date().toISOString(),
  });

  eventClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  const session = sessions.get(callId);
  if (session) {
    session.eventClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

function createOpenAISessionConfig(config: SessionConfig) {
  const turnDetection =
    config.turnDetection.type === "server_vad"
      ? {
          type: "server_vad",
          threshold: config.turnDetection.threshold || 0.5,
          prefix_padding_ms: config.turnDetection.prefix_padding_ms || 300,
          silence_duration_ms: config.turnDetection.silence_duration_ms || 200,
          create_response: config.turnDetection.create_response,
          interrupt_response: config.turnDetection.interrupt_response,
        }
      : {
          type: "semantic_vad",
          eagerness: config.turnDetection.eagerness || "medium",
          create_response: config.turnDetection.create_response,
          interrupt_response: config.turnDetection.interrupt_response,
        };

  return {
    type: "session.update",
    session: {
      modalities: ["audio", "text"],
      instructions: config.instructions,
      voice: config.voice,
      input_audio_format: "g711_ulaw",
      output_audio_format: "g711_ulaw",
      input_audio_transcription: {
        model: "gpt-4o-mini-transcribe",
      },
      turn_detection: turnDetection,
      input_audio_noise_reduction: config.inputAudioNoiseReduction,
      temperature: config.temperature,
      max_response_output_tokens:
        config.maxResponseOutputTokens === "inf"
          ? "inf"
          : config.maxResponseOutputTokens,
    },
  };
}

function connectToOpenAI(session: CallSession): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${OPENAI_REALTIME_URL}?model=${MODEL}`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    ws.on("open", () => {
      log(`OpenAI WebSocket connected for call ${session.callId}`);

      const sessionConfig = createOpenAISessionConfig(session.config);
      ws.send(JSON.stringify(sessionConfig));

      broadcastEvent(session.callId, {
        type: "openai.connected",
        source: "system",
        direction: "outgoing",
        summary: "Connected to OpenAI Realtime API",
      });

      resolve(ws);
    });

    ws.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString());
        handleOpenAIEvent(session, event);
      } catch (error) {
        log("Failed to parse OpenAI message", error);
      }
    });

    ws.on("error", (error) => {
      log(`OpenAI WebSocket error for call ${session.callId}`, error);
      broadcastEvent(session.callId, {
        type: "openai.error",
        source: "openai",
        direction: "incoming",
        payload: { error: String(error) },
        summary: "OpenAI connection error",
      });
      reject(error);
    });

    ws.on("close", (code, reason) => {
      log(`OpenAI WebSocket closed for call ${session.callId}`, {
        code,
        reason: reason.toString(),
      });
      broadcastEvent(session.callId, {
        type: "openai.disconnected",
        source: "system",
        direction: "incoming",
        summary: "Disconnected from OpenAI",
      });
    });
  });
}

function handleOpenAIEvent(session: CallSession, event: Record<string, unknown>) {
  const eventType = event.type as string;

  // Track usage
  if (eventType === "response.done" && event.usage) {
    const usage = event.usage as { input_tokens?: number; output_tokens?: number };
    session.inputTokens += usage.input_tokens || 0;
    session.outputTokens += usage.output_tokens || 0;
  }

  // Broadcast non-audio events
  if (!eventType.includes("audio.delta")) {
    broadcastEvent(session.callId, {
      type: eventType,
      source: "openai",
      direction: "incoming",
      payload: eventType === "error" ? event : undefined,
      summary: getEventSummary(eventType, event),
    });
  }

  switch (eventType) {
    case "session.created":
    case "session.updated":
      log(`Session ${eventType} for call ${session.callId}`);
      break;

    case "response.audio.delta":
      // Send audio to Twilio
      if (session.streamSid && session.twilioWs.readyState === WebSocket.OPEN) {
        const delta = event.delta as string;
        session.twilioWs.send(
          JSON.stringify({
            event: "media",
            streamSid: session.streamSid,
            media: {
              payload: delta,
            },
          })
        );

        // Buffer for recording
        if (session.isRecording && delta) {
          session.recordingBuffer.ai.push(Buffer.from(delta, "base64"));
        }
      }
      break;

    case "response.audio.done":
      log(`Response audio complete for call ${session.callId}`);
      break;

    case "input_audio_buffer.speech_started":
      log(`Speech started for call ${session.callId}`);
      // Clear any pending audio in Twilio buffer
      if (session.streamSid && session.twilioWs.readyState === WebSocket.OPEN) {
        session.twilioWs.send(
          JSON.stringify({
            event: "clear",
            streamSid: session.streamSid,
          })
        );
      }
      break;

    case "input_audio_buffer.speech_stopped":
      log(`Speech stopped for call ${session.callId}`);
      break;

    case "conversation.item.input_audio_transcription.completed":
      const transcript = (event as { transcript?: string }).transcript;
      if (transcript) {
        log(`Transcription: ${transcript}`);
        broadcastEvent(session.callId, {
          type: "transcription.user",
          source: "openai",
          direction: "incoming",
          payload: { text: transcript },
          summary: transcript,
        });
      }
      break;

    case "response.output_item.done":
      const item = event.item as { content?: Array<{ transcript?: string }> };
      const responseTranscript = item?.content?.[0]?.transcript;
      if (responseTranscript) {
        broadcastEvent(session.callId, {
          type: "transcription.assistant",
          source: "openai",
          direction: "incoming",
          payload: { text: responseTranscript },
          summary: responseTranscript,
        });
      }
      break;

    case "error":
      log(`OpenAI error for call ${session.callId}`, event.error);
      break;

    default:
      break;
  }
}

function getEventSummary(eventType: string, event: Record<string, unknown>): string | undefined {
  switch (eventType) {
    case "session.created":
      return "Session created";
    case "session.updated":
      return "Session configured";
    case "response.created":
      return "Generating response...";
    case "response.done":
      return "Response complete";
    case "input_audio_buffer.speech_started":
      return "User speaking...";
    case "input_audio_buffer.speech_stopped":
      return "User finished speaking";
    case "error":
      return `Error: ${(event.error as { message?: string })?.message}`;
    default:
      return undefined;
  }
}

function handleTwilioMessage(session: CallSession, message: Record<string, unknown>) {
  const event = message.event as string;

  switch (event) {
    case "connected":
      log(`Twilio stream connected for call ${session.callId}`);
      broadcastEvent(session.callId, {
        type: "twilio.connected",
        source: "twilio",
        direction: "incoming",
        summary: "Twilio media stream connected",
      });
      break;

    case "start":
      const start = message.start as {
        streamSid: string;
        callSid: string;
        customParameters?: Record<string, string>;
      };
      session.streamSid = start.streamSid;
      log(`Twilio stream started`, { streamSid: start.streamSid, callSid: start.callSid });

      broadcastEvent(session.callId, {
        type: "twilio.start",
        source: "twilio",
        direction: "incoming",
        payload: { streamSid: start.streamSid, callSid: start.callSid },
        summary: "Media stream started",
      });

      // Connect to OpenAI now that stream is ready
      connectToOpenAI(session)
        .then((ws) => {
          session.openaiWs = ws;
        })
        .catch((error) => {
          log(`Failed to connect to OpenAI`, error);
        });
      break;

    case "media":
      const media = message.media as { payload: string; timestamp: string };

      // Forward audio to OpenAI
      if (session.openaiWs?.readyState === WebSocket.OPEN) {
        session.openaiWs.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: media.payload,
          })
        );
      }

      // Buffer for recording
      if (session.isRecording && media.payload) {
        session.recordingBuffer.caller.push(Buffer.from(media.payload, "base64"));
      }
      break;

    case "dtmf":
      const dtmf = message.dtmf as { digit: string };
      log(`DTMF received: ${dtmf.digit}`);
      broadcastEvent(session.callId, {
        type: "twilio.dtmf",
        source: "twilio",
        direction: "incoming",
        payload: { digit: dtmf.digit },
        summary: `DTMF: ${dtmf.digit}`,
      });
      break;

    case "mark":
      const mark = message.mark as { name: string };
      log(`Mark received: ${mark.name}`);
      break;

    case "stop":
      log(`Twilio stream stopped for call ${session.callId}`);
      broadcastEvent(session.callId, {
        type: "twilio.stop",
        source: "twilio",
        direction: "incoming",
        summary: "Media stream stopped",
      });

      // Close OpenAI connection
      if (session.openaiWs) {
        session.openaiWs.close();
      }

      // Calculate final metrics
      const durationSeconds = Math.floor(
        (Date.now() - session.startTime.getTime()) / 1000
      );

      broadcastEvent(session.callId, {
        type: "call.ended",
        source: "system",
        direction: "incoming",
        payload: {
          durationSeconds,
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
        },
        summary: `Call ended (${durationSeconds}s)`,
      });

      // Clean up session after a delay to allow final events
      setTimeout(() => {
        sessions.delete(session.callId);
      }, 5000);
      break;

    default:
      break;
  }
}

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server running");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const { pathname, query } = parse(req.url || "", true);

  if (pathname === "/events") {
    // Event stream client
    log("Event stream client connected");
    eventClients.add(ws);

    ws.on("close", () => {
      eventClients.delete(ws);
      log("Event stream client disconnected");
    });

    ws.send(
      JSON.stringify({
        type: "connected",
        source: "system",
        direction: "incoming",
        summary: "Connected to event stream",
      })
    );
    return;
  }

  if (pathname === "/media-stream") {
    // Twilio Media Stream
    const callId = (query.callId as string) || `call-${Date.now()}`;
    const configStr = query.config as string;

    let config: SessionConfig;
    try {
      config = configStr ? JSON.parse(decodeURIComponent(configStr)) : getDefaultConfig();
    } catch {
      config = getDefaultConfig();
    }

    const isRecording = query.record === "true";

    const session: CallSession = {
      callId,
      streamSid: null,
      twilioWs: ws,
      openaiWs: null,
      config,
      isRecording,
      recordingBuffer: {
        caller: [],
        ai: [],
      },
      eventClients: new Set(),
      inputTokens: 0,
      outputTokens: 0,
      startTime: new Date(),
    };

    sessions.set(callId, session);
    log(`New media stream connection for call ${callId}`);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleTwilioMessage(session, message);
      } catch (error) {
        log("Failed to parse Twilio message", error);
      }
    });

    ws.on("close", () => {
      log(`Twilio connection closed for call ${callId}`);
      if (session.openaiWs) {
        session.openaiWs.close();
      }
    });

    ws.on("error", (error) => {
      log(`Twilio WebSocket error for call ${callId}`, error);
    });

    return;
  }

  // Unknown path
  ws.close(1008, "Unknown path");
});

function getDefaultConfig(): SessionConfig {
  return {
    voice: "marin",
    instructions: `You are a helpful AI assistant making a phone call. Speak naturally and conversationally.

Guidelines:
- Greet the person warmly
- Listen carefully before responding
- Ask clarifying questions when needed
- Be patient and understanding
- Keep responses concise but informative
- End calls politely`,
    turnDetection: {
      type: "semantic_vad",
      eagerness: "medium",
      create_response: true,
      interrupt_response: true,
    },
    inputAudioNoiseReduction: { type: "near_field" },
    temperature: 0.8,
    maxResponseOutputTokens: 4096,
  };
}

// Graceful shutdown
process.on("SIGTERM", () => {
  log("Shutting down WebSocket server...");
  wss.clients.forEach((client) => client.close());
  httpServer.close(() => {
    log("Server closed");
    process.exit(0);
  });
});

httpServer.listen(PORT, () => {
  log(`WebSocket server running on port ${PORT}`);
  log(`Media stream endpoint: ws://localhost:${PORT}/media-stream`);
  log(`Event stream endpoint: ws://localhost:${PORT}/events`);
});

export { sessions, broadcastEvent };
