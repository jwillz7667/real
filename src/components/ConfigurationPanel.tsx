"use client";

import { useStore } from "@/store";
import { VOICES, type Voice, type SemanticVadEagerness } from "@/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Volume2, Sparkles, Settings2 } from "lucide-react";

export function ConfigurationPanel() {
  const { config, setConfig } = useStore();

  const handleVoiceChange = (voice: Voice) => {
    setConfig({ voice });
  };

  const handleTurnDetectionTypeChange = (type: "server_vad" | "semantic_vad") => {
    if (type === "server_vad") {
      setConfig({
        turnDetection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
          interrupt_response: true,
        },
      });
    } else {
      setConfig({
        turnDetection: {
          type: "semantic_vad",
          eagerness: "medium",
          create_response: true,
          interrupt_response: true,
        },
      });
    }
  };

  const handleEagernessChange = (eagerness: SemanticVadEagerness) => {
    if (config.turnDetection.type === "semantic_vad") {
      setConfig({
        turnDetection: { ...config.turnDetection, eagerness },
      });
    }
  };

  const handleServerVadChange = (
    key: "threshold" | "prefix_padding_ms" | "silence_duration_ms",
    value: number
  ) => {
    if (config.turnDetection.type === "server_vad") {
      setConfig({
        turnDetection: { ...config.turnDetection, [key]: value },
      });
    }
  };

  const handleCreateResponseChange = (create_response: boolean) => {
    setConfig({
      turnDetection: { ...config.turnDetection, create_response },
    });
  };

  const handleInterruptResponseChange = (interrupt_response: boolean) => {
    setConfig({
      turnDetection: { ...config.turnDetection, interrupt_response },
    });
  };

  const handleNoiseReductionChange = (value: string) => {
    if (value === "off") {
      setConfig({ inputAudioNoiseReduction: null });
    } else {
      setConfig({
        inputAudioNoiseReduction: { type: value as "near_field" | "far_field" },
      });
    }
  };

  const handleTemperatureChange = (value: number[]) => {
    setConfig({ temperature: value[0] });
  };

  const handleMaxTokensChange = (value: string) => {
    setConfig({
      maxResponseOutputTokens: value === "inf" ? "inf" : parseInt(value),
    });
  };

  const handleInstructionsChange = (instructions: string) => {
    setConfig({ instructions });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4" />
            Voice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={config.voice} onValueChange={handleVoiceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((voice) => (
                <SelectItem key={voice.value} value={voice.value}>
                  <div className="flex items-center gap-2">
                    <span>{voice.label}</span>
                    {voice.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {voice.badge}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-zinc-500">
            {VOICES.find((v) => v.value === config.voice)?.description}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" />
            Turn Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={config.turnDetection.type}
            onValueChange={handleTurnDetectionTypeChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="server_vad" id="server_vad" />
              <Label htmlFor="server_vad" className="font-normal">
                Server VAD (Voice Activity)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="semantic_vad" id="semantic_vad" />
              <Label htmlFor="semantic_vad" className="font-normal">
                Semantic VAD (Context-Aware)
              </Label>
            </div>
          </RadioGroup>

          <div className="border-t pt-4">
            {config.turnDetection.type === "server_vad" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm">Threshold</Label>
                    <span className="text-sm text-zinc-500">
                      {config.turnDetection.threshold.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[config.turnDetection.threshold]}
                    onValueChange={(v) => handleServerVadChange("threshold", v[0])}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Speech detection sensitivity
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm">Prefix Padding</Label>
                    <span className="text-sm text-zinc-500">
                      {config.turnDetection.prefix_padding_ms}ms
                    </span>
                  </div>
                  <Slider
                    value={[config.turnDetection.prefix_padding_ms]}
                    onValueChange={(v) =>
                      handleServerVadChange("prefix_padding_ms", v[0])
                    }
                    min={0}
                    max={1000}
                    step={50}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Audio to include before speech
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-sm">Silence Duration</Label>
                    <span className="text-sm text-zinc-500">
                      {config.turnDetection.silence_duration_ms}ms
                    </span>
                  </div>
                  <Slider
                    value={[config.turnDetection.silence_duration_ms]}
                    onValueChange={(v) =>
                      handleServerVadChange("silence_duration_ms", v[0])
                    }
                    min={0}
                    max={2000}
                    step={50}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Silence before end of turn
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-sm">Eagerness</Label>
                <RadioGroup
                  className="mt-2 flex gap-4"
                  value={config.turnDetection.eagerness}
                  onValueChange={handleEagernessChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low" className="font-normal">
                      Low
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="font-normal">
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high" className="font-normal">
                      High
                    </Label>
                  </div>
                </RadioGroup>
                <p className="mt-2 text-xs text-zinc-500">
                  How eager to respond vs wait for more input
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="create_response" className="font-normal">
                Create response automatically
              </Label>
              <Switch
                id="create_response"
                checked={config.turnDetection.create_response}
                onCheckedChange={handleCreateResponseChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="interrupt_response" className="font-normal">
                Allow interruptions
              </Label>
              <Switch
                id="interrupt_response"
                checked={config.turnDetection.interrupt_response}
                onCheckedChange={handleInterruptResponseChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Noise Reduction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.inputAudioNoiseReduction?.type || "off"}
            onValueChange={handleNoiseReductionChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="off" id="nr_off" />
              <Label htmlFor="nr_off" className="font-normal">
                Off
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="near_field" id="nr_near" />
              <Label htmlFor="nr_near" className="font-normal">
                Near Field (Close to mic)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="far_field" id="nr_far" />
              <Label htmlFor="nr_far" className="font-normal">
                Far Field (Speakerphone)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Response Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm">Temperature</Label>
              <span className="text-sm text-zinc-500">
                {config.temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[config.temperature]}
              onValueChange={handleTemperatureChange}
              min={0.6}
              max={1.2}
              step={0.1}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Creativity/randomness (0.6-1.2)
            </p>
          </div>
          <div>
            <Label className="text-sm">Max Output Tokens</Label>
            <Select
              value={String(config.maxResponseOutputTokens)}
              onValueChange={handleMaxTokensChange}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024">1,024</SelectItem>
                <SelectItem value="2048">2,048</SelectItem>
                <SelectItem value="4096">4,096</SelectItem>
                <SelectItem value="inf">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.instructions}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            placeholder="Enter system instructions for the AI..."
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="mt-2 text-xs text-zinc-500 text-right">
            {config.instructions.length} characters
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
