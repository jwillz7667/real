export type Voice =
  | "marin"
  | "cedar"
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse";

export type TurnDetectionType = "server_vad" | "semantic_vad";
export type SemanticVadEagerness = "low" | "medium" | "high";
export type NoiseReductionType = "near_field" | "far_field" | null;

export interface ServerVadConfig {
  type: "server_vad";
  threshold: number;
  prefix_padding_ms: number;
  silence_duration_ms: number;
  create_response: boolean;
  interrupt_response: boolean;
}

export interface SemanticVadConfig {
  type: "semantic_vad";
  eagerness: SemanticVadEagerness;
  create_response: boolean;
  interrupt_response: boolean;
}

export type TurnDetectionConfig = ServerVadConfig | SemanticVadConfig;

export interface NoiseReductionConfig {
  type: "near_field" | "far_field";
}

export interface RealtimeSessionConfig {
  voice: Voice;
  turnDetection: TurnDetectionConfig;
  inputAudioNoiseReduction: NoiseReductionConfig | null;
  instructions: string;
  temperature: number;
  maxResponseOutputTokens: number | "inf";
}

export interface OutboundCallRequest {
  phoneNumber: string;
  config: RealtimeSessionConfig;
  recordCall: boolean;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  twilioCallSid?: string;
  status?: string;
  error?: string;
}

export type CallDirection = "inbound" | "outbound";
export type CallStatus =
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "busy"
  | "no-answer";

export interface Call {
  id: string;
  createdAt: string;
  endedAt: string | null;
  phoneNumber: string;
  direction: CallDirection;
  status: CallStatus;
  durationSeconds: number | null;
  twilioCallSid: string | null;
  recordingUrl: string | null;
  recordingDuration: number | null;
  configSnapshot: RealtimeSessionConfig | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
}

export type EventSource = "twilio" | "openai" | "system";
export type EventDirection = "incoming" | "outgoing";

export interface LoggedEvent {
  id: string;
  timestamp: string;
  source: EventSource;
  direction: EventDirection;
  eventType: string;
  payload: Record<string, unknown>;
  callId: string;
  summary?: string;
}

export interface Prompt {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
  instructions: string;
  isDefault: boolean;
  tags: string[];
}

export interface CreatePromptRequest {
  name: string;
  description?: string;
  instructions: string;
  tags?: string[];
  isDefault?: boolean;
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const VOICES: { value: Voice; label: string; description: string; badge?: string }[] = [
  { value: "marin", label: "Marin", description: "Warm, natural (female)", badge: "Recommended" },
  { value: "cedar", label: "Cedar", description: "Calm, authoritative (male)", badge: "Exclusive" },
  { value: "alloy", label: "Alloy", description: "Neutral, balanced" },
  { value: "ash", label: "Ash", description: "Confident, professional" },
  { value: "ballad", label: "Ballad", description: "Soft, storytelling" },
  { value: "coral", label: "Coral", description: "Clear, friendly" },
  { value: "echo", label: "Echo", description: "Smooth, engaging" },
  { value: "sage", label: "Sage", description: "Wise, measured" },
  { value: "shimmer", label: "Shimmer", description: "Bright, energetic" },
  { value: "verse", label: "Verse", description: "Versatile, expressive" },
];

export const DEFAULT_CONFIG: RealtimeSessionConfig = {
  voice: "marin",
  turnDetection: {
    type: "semantic_vad",
    eagerness: "medium",
    create_response: true,
    interrupt_response: true,
  },
  inputAudioNoiseReduction: { type: "near_field" },
  instructions: `You are a helpful AI assistant making a phone call. Speak naturally and conversationally.

Guidelines:
- Greet the person warmly
- Listen carefully before responding
- Ask clarifying questions when needed
- Be patient and understanding
- Keep responses concise but informative
- End calls politely`,
  temperature: 0.8,
  maxResponseOutputTokens: 4096,
};
