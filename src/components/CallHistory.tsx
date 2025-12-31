"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { formatDuration, formatDate } from "@/lib/utils";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Download,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Call } from "@/types";

export function CallHistory() {
  const { calls, setCalls } = useStore();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCalls = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (directionFilter !== "all") params.set("direction", directionFilter);
      if (search) params.set("search", search);

      const response = await fetch(`/api/calls/history?${params}`);
      const data = await response.json();
      setCalls(data.calls);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Failed to fetch calls:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page, statusFilter, directionFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "busy":
        return <Badge variant="warning">Busy</Badge>;
      case "no-answer":
        return <Badge variant="secondary">No Answer</Badge>;
      case "in-progress":
        return <Badge variant="info">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePlayRecording = async (call: Call) => {
    if (!call.recordingUrl) return;
    window.open(call.recordingUrl, "_blank");
  };

  const handleDownloadRecording = async (call: Call) => {
    if (!call.recordingUrl) return;
    const a = document.createElement("a");
    a.href = call.recordingUrl;
    a.download = `recording-${call.id}.wav`;
    a.click();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Call History</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchCalls}>
              Refresh
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchCalls()}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500">Loading...</p>
              </div>
            ) : calls.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500">No calls yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="h-4 w-4 text-green-500" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{call.phoneNumber}</p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(call.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(call.status)}
                      {call.durationSeconds && (
                        <span className="text-sm text-zinc-500">
                          {formatDuration(call.durationSeconds)}
                        </span>
                      )}
                      <div className="flex gap-1">
                        {call.recordingUrl && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handlePlayRecording(call)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadRecording(call)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedCall(call)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Phone Number</p>
                  <p className="font-medium">{selectedCall.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Direction</p>
                  <p className="font-medium capitalize">{selectedCall.direction}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Status</p>
                  {getStatusBadge(selectedCall.status)}
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Duration</p>
                  <p className="font-medium">
                    {selectedCall.durationSeconds
                      ? formatDuration(selectedCall.durationSeconds)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Date</p>
                  <p className="font-medium">{formatDate(selectedCall.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Twilio SID</p>
                  <p className="font-mono text-xs truncate">
                    {selectedCall.twilioCallSid || "N/A"}
                  </p>
                </div>
              </div>

              {selectedCall.recordingUrl && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Recording</p>
                  <audio controls className="w-full" src={selectedCall.recordingUrl}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {selectedCall.configSnapshot && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Configuration Used</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-zinc-500">Voice:</span>{" "}
                      {selectedCall.configSnapshot.voice}
                    </p>
                    <p>
                      <span className="text-zinc-500">Temperature:</span>{" "}
                      {selectedCall.configSnapshot.temperature}
                    </p>
                    <p>
                      <span className="text-zinc-500">Turn Detection:</span>{" "}
                      {selectedCall.configSnapshot.turnDetection.type}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-zinc-500 mb-2">Usage & Cost</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500">Input Tokens</p>
                    <p className="font-medium">
                      {selectedCall.totalInputTokens.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Output Tokens</p>
                    <p className="font-medium">
                      {selectedCall.totalOutputTokens.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Estimated Cost</p>
                    <p className="font-medium">${selectedCall.estimatedCost}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
