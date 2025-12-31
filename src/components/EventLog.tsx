"use client";

import { useRef, useEffect, useState } from "react";
import { useStore, getFilteredEvents } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTimestampWithMs, truncatePayload } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  Trash2,
  ArrowDownToLine,
  Download,
} from "lucide-react";
import type { LoggedEvent } from "@/types";

export function EventLog() {
  const {
    events,
    eventFilter,
    eventSourceFilter,
    eventSearch,
    setEventFilter,
    setEventSourceFilter,
    setEventSearch,
    clearEvents,
  } = useStore();

  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<LoggedEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredEvents = getFilteredEvents(useStore.getState());

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);

  const getSourceColor = (source: string) => {
    switch (source) {
      case "openai":
        return "text-blue-600 dark:text-blue-400";
      case "twilio":
        return "text-green-600 dark:text-green-400";
      case "system":
        return "text-zinc-500 dark:text-zinc-400";
      default:
        return "text-zinc-500";
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "openai":
        return "info";
      case "twilio":
        return "success";
      default:
        return "secondary";
    }
  };

  const exportEvents = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const collapsedEvents = filteredEvents.reduce<
    Array<{ event: LoggedEvent; count: number }>
  >((acc, event) => {
    const last = acc[acc.length - 1];
    if (
      last &&
      last.event.eventType === event.eventType &&
      last.event.source === event.source &&
      (event.eventType === "media" ||
        event.eventType.includes("audio.delta"))
    ) {
      last.count++;
    } else {
      acc.push({ event, count: 1 });
    }
    return acc;
  }, []);

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">WebSocket Events</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className={autoScroll ? "text-blue-600" : ""}
              >
                <ArrowDownToLine className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exportEvents}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={clearEvents}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="response">Response</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventSourceFilter} onValueChange={setEventSourceFilter}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full" ref={scrollRef}>
            <div className="p-4 space-y-1 font-mono text-xs">
              {collapsedEvents.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">
                  No events yet. Start a call to see events.
                </p>
              ) : (
                collapsedEvents.map(({ event, count }, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    className="flex items-start gap-2 py-1 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <span className="text-zinc-400 flex-shrink-0">
                      {formatTimestampWithMs(event.timestamp)}
                    </span>
                    <span className="flex-shrink-0">
                      {event.direction === "outgoing" ? (
                        <ArrowRight className="h-3 w-3 text-amber-500" />
                      ) : (
                        <ArrowLeft className="h-3 w-3 text-green-500" />
                      )}
                    </span>
                    <Badge
                      variant={getSourceBadge(event.source) as "info" | "success" | "secondary"}
                      className="text-[10px] px-1 py-0"
                    >
                      {event.source}
                    </Badge>
                    <span className={`font-medium ${getSourceColor(event.source)}`}>
                      {event.eventType}
                    </span>
                    {count > 1 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        x{count}
                      </Badge>
                    )}
                    {event.summary && (
                      <span className="text-zinc-500 truncate">
                        {event.summary}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {selectedEvent?.eventType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Timestamp:</span>
                <p className="font-mono">
                  {selectedEvent && formatTimestampWithMs(selectedEvent.timestamp)}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Source:</span>
                <p>{selectedEvent?.source}</p>
              </div>
              <div>
                <span className="text-zinc-500">Direction:</span>
                <p>{selectedEvent?.direction}</p>
              </div>
              <div>
                <span className="text-zinc-500">Call ID:</span>
                <p className="font-mono text-xs truncate">
                  {selectedEvent?.callId || "N/A"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm text-zinc-500">Payload:</span>
              <pre className="mt-2 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-auto text-xs">
                {selectedEvent &&
                  JSON.stringify(selectedEvent.payload, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
