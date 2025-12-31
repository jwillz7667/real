import { create } from "zustand";
import type {
  RealtimeSessionConfig,
  LoggedEvent,
  Call,
  Prompt,
  CallStatus,
} from "@/types";
import { DEFAULT_CONFIG } from "@/types";
import { generateId } from "@/lib/utils";

interface CallState {
  currentCallId: string | null;
  currentCallSid: string | null;
  callStatus: CallStatus | "idle";
  callStartTime: Date | null;
  callDuration: number;
  isRecording: boolean;
  phoneNumber: string;
}

interface AppState {
  config: RealtimeSessionConfig;
  call: CallState;
  events: LoggedEvent[];
  calls: Call[];
  prompts: Prompt[];
  isConnected: boolean;
  eventFilter: string;
  eventSourceFilter: "all" | "openai" | "twilio" | "system";
  eventSearch: string;
  darkMode: boolean;

  setConfig: (config: Partial<RealtimeSessionConfig>) => void;
  resetConfig: () => void;
  setPhoneNumber: (phoneNumber: string) => void;
  setCallStatus: (status: CallStatus | "idle") => void;
  startCall: (callId: string, callSid: string) => void;
  endCall: () => void;
  setRecording: (isRecording: boolean) => void;
  updateCallDuration: (duration: number) => void;

  addEvent: (event: Omit<LoggedEvent, "id" | "timestamp">) => void;
  clearEvents: () => void;
  setEventFilter: (filter: string) => void;
  setEventSourceFilter: (filter: "all" | "openai" | "twilio" | "system") => void;
  setEventSearch: (search: string) => void;

  setCalls: (calls: Call[]) => void;
  addCall: (call: Call) => void;
  updateCall: (callId: string, updates: Partial<Call>) => void;

  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (promptId: string, updates: Partial<Prompt>) => void;
  removePrompt: (promptId: string) => void;
  loadPrompt: (prompt: Prompt) => void;

  setConnected: (connected: boolean) => void;
  toggleDarkMode: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  config: DEFAULT_CONFIG,
  call: {
    currentCallId: null,
    currentCallSid: null,
    callStatus: "idle",
    callStartTime: null,
    callDuration: 0,
    isRecording: false,
    phoneNumber: "",
  },
  events: [],
  calls: [],
  prompts: [],
  isConnected: false,
  eventFilter: "all",
  eventSourceFilter: "all",
  eventSearch: "",
  darkMode: false,

  setConfig: (updates) =>
    set((state) => ({
      config: { ...state.config, ...updates },
    })),

  resetConfig: () => set({ config: DEFAULT_CONFIG }),

  setPhoneNumber: (phoneNumber) =>
    set((state) => ({
      call: { ...state.call, phoneNumber },
    })),

  setCallStatus: (status) =>
    set((state) => ({
      call: { ...state.call, callStatus: status },
    })),

  startCall: (callId, callSid) =>
    set((state) => ({
      call: {
        ...state.call,
        currentCallId: callId,
        currentCallSid: callSid,
        callStatus: "initiated",
        callStartTime: new Date(),
        callDuration: 0,
      },
    })),

  endCall: () =>
    set((state) => ({
      call: {
        ...state.call,
        currentCallId: null,
        currentCallSid: null,
        callStatus: "idle",
        callStartTime: null,
        callDuration: 0,
        isRecording: false,
      },
    })),

  setRecording: (isRecording) =>
    set((state) => ({
      call: { ...state.call, isRecording },
    })),

  updateCallDuration: (duration) =>
    set((state) => ({
      call: { ...state.call, callDuration: duration },
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [
        ...state.events,
        {
          ...event,
          id: generateId(),
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  clearEvents: () => set({ events: [] }),

  setEventFilter: (filter) => set({ eventFilter: filter }),

  setEventSourceFilter: (filter) => set({ eventSourceFilter: filter }),

  setEventSearch: (search) => set({ eventSearch: search }),

  setCalls: (calls) => set({ calls }),

  addCall: (call) =>
    set((state) => ({
      calls: [call, ...state.calls],
    })),

  updateCall: (callId, updates) =>
    set((state) => ({
      calls: state.calls.map((c) =>
        c.id === callId ? { ...c, ...updates } : c
      ),
    })),

  setPrompts: (prompts) => set({ prompts }),

  addPrompt: (prompt) =>
    set((state) => ({
      prompts: [prompt, ...state.prompts],
    })),

  updatePrompt: (promptId, updates) =>
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === promptId ? { ...p, ...updates } : p
      ),
    })),

  removePrompt: (promptId) =>
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== promptId),
    })),

  loadPrompt: (prompt) =>
    set((state) => ({
      config: { ...state.config, instructions: prompt.instructions },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));

export const getFilteredEvents = (state: AppState): LoggedEvent[] => {
  let filtered = state.events;

  if (state.eventSourceFilter !== "all") {
    filtered = filtered.filter((e) => e.source === state.eventSourceFilter);
  }

  if (state.eventFilter !== "all") {
    filtered = filtered.filter((e) => {
      switch (state.eventFilter) {
        case "session":
          return e.eventType.startsWith("session");
        case "audio":
          return (
            e.eventType.includes("audio") || e.eventType === "media"
          );
        case "response":
          return e.eventType.startsWith("response");
        case "error":
          return e.eventType === "error";
        default:
          return true;
      }
    });
  }

  if (state.eventSearch) {
    const search = state.eventSearch.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.eventType.toLowerCase().includes(search) ||
        (e.summary && e.summary.toLowerCase().includes(search))
    );
  }

  return filtered;
};
