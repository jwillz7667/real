"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Star,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Loader2,
} from "lucide-react";
import type { Prompt } from "@/types";

export function PromptsLibrary() {
  const { prompts, setPrompts, addPrompt, updatePrompt, removePrompt, loadPrompt } =
    useStore();

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    tags: "",
    isDefault: false,
  });

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/prompts");
      const data = await response.json();
      setPrompts(data.prompts);
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(search.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(search.toLowerCase()) ||
      prompt.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreateDialog = () => {
    setEditingPrompt(null);
    setFormData({
      name: "",
      description: "",
      instructions: "",
      tags: "",
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description || "",
      instructions: prompt.instructions,
      tags: prompt.tags.join(", "),
      isDefault: prompt.isDefault,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (prompt: Prompt) => {
    setEditingPrompt(null);
    setFormData({
      name: `${prompt.name} (Copy)`,
      description: prompt.description || "",
      instructions: prompt.instructions,
      tags: prompt.tags.join(", "),
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.instructions) {
      alert("Name and instructions are required");
      return;
    }

    const tagsArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingPrompt) {
        const response = await fetch(`/api/prompts/${editingPrompt.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            instructions: formData.instructions,
            tags: tagsArray,
            isDefault: formData.isDefault,
          }),
        });
        const data = await response.json();
        updatePrompt(editingPrompt.id, data.prompt);
      } else {
        const response = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            instructions: formData.instructions,
            tags: tagsArray,
            isDefault: formData.isDefault,
          }),
        });
        const data = await response.json();
        addPrompt(data.prompt);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to save prompt:", error);
      alert("Failed to save prompt");
    }
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!confirm(`Delete "${prompt.name}"?`)) return;

    try {
      await fetch(`/api/prompts/${prompt.id}`, { method: "DELETE" });
      removePrompt(prompt.id);
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      alert("Failed to delete prompt");
    }
  };

  const handleLoad = (prompt: Prompt) => {
    loadPrompt(prompt);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Saved Prompts</CardTitle>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="h-12 w-12 text-zinc-300 mb-2" />
                <p className="text-zinc-500">No prompts yet</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Create your first prompt to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-3 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {prompt.isDefault ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-zinc-400" />
                        )}
                        <div>
                          <p className="font-medium">{prompt.name}</p>
                          {prompt.description && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {prompt.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prompt.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 mt-3">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleLoad(prompt)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(prompt)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(prompt)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "Create Prompt"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Customer Support Agent"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the prompt's purpose"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions *</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
                placeholder="Enter the system instructions for the AI..."
                className="mt-1.5 min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 text-right mt-1">
                {formData.instructions.length} / 10,000
              </p>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="e.g., support, customer-service, friendly"
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Set as default prompt</Label>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingPrompt ? "Save Changes" : "Create Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
