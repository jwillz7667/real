"use client";

import { useEffect } from "react";
import { useStore } from "@/store";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { CallControls } from "@/components/CallControls";
import { EventLog } from "@/components/EventLog";
import { CallHistory } from "@/components/CallHistory";
import { PromptsLibrary } from "@/components/PromptsLibrary";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, Sun, Phone } from "lucide-react";

export default function Dashboard() {
  const { darkMode, toggleDarkMode } = useStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <h1 className="font-semibold text-lg">Voice Agent Console</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <div className="lg:sticky lg:top-6">
              <h2 className="text-sm font-medium text-zinc-500 mb-4">
                Configuration
              </h2>
              <div className="max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
                <ConfigurationPanel />
              </div>
            </div>
          </div>

          {/* Right Column - Call Controls & Events */}
          <div className="lg:col-span-8 space-y-6">
            {/* Call Controls */}
            <CallControls />

            {/* Event Log */}
            <div className="h-[400px]">
              <EventLog />
            </div>

            {/* History & Prompts Tabs */}
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="history">Call History</TabsTrigger>
                <TabsTrigger value="prompts">Saved Prompts</TabsTrigger>
              </TabsList>
              <TabsContent value="history" className="mt-4">
                <CallHistory />
              </TabsContent>
              <TabsContent value="prompts" className="mt-4">
                <PromptsLibrary />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
