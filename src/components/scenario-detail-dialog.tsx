"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageSquare,
  Database,
  MessageCircle,
  Edit,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { ChatMessage } from "@/types/scenario";

interface ScenarioDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: {
    id: string;
    name: string;
    conversationMessages: ChatMessage[];
    srData: Array<Record<string, unknown>>;
    pastSupplierConversation: ChatMessage[];
    createdAt: Date | string;
  } | null;
  onUpdateOnly: (scenario: {
    id: string;
    name: string;
    conversationMessages: ChatMessage[];
    srData: Array<Record<string, unknown>>;
    pastSupplierConversation: ChatMessage[];
  }) => void;
  onUpdateAndLoad: (scenario: {
    id: string;
    name: string;
    conversationMessages: ChatMessage[];
    srData: Array<Record<string, unknown>>;
    pastSupplierConversation: ChatMessage[];
  }) => void;
  isUpdating?: boolean;
}

type MessageSection = "conversation" | "supplier";

interface EditingMessage {
  section: MessageSection;
  index: number;
  content: string;
}

export function ScenarioDetailDialog({
  open,
  onOpenChange,
  scenario,
  onUpdateOnly,
  onUpdateAndLoad,
  isUpdating,
}: ScenarioDetailDialogProps) {
  const [expandedSections, setExpandedSections] = React.useState({
    conversation: true,
    srData: false,
    supplierChat: false,
  });
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState("");
  const [editingMessage, setEditingMessage] = React.useState<EditingMessage | null>(null);
  const [addingMessageTo, setAddingMessageTo] = React.useState<MessageSection | null>(null);
  const [newMessageRole, setNewMessageRole] = React.useState<"user" | "assistant">("user");
  const [newMessageContent, setNewMessageContent] = React.useState("");
  const [localScenario, setLocalScenario] = React.useState(scenario);

  React.useEffect(() => {
    setLocalScenario(scenario);
  }, [scenario]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (content: string, sectionId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const startEditingName = () => {
    if (scenario) {
      setEditedName(scenario.name);
      setEditingName(true);
    }
  };

  const saveName = () => {
    if (localScenario && editedName.trim()) {
      setLocalScenario({ ...localScenario, name: editedName.trim() });
    }
    setEditingName(false);
  };

  const cancelEditName = () => {
    setEditingName(false);
    if (scenario) {
      setLocalScenario(scenario);
    }
  };

  const startEditingMessage = (section: MessageSection, index: number) => {
    const messages = section === "conversation" ? localScenario?.conversationMessages : localScenario?.pastSupplierConversation;
    if (messages && messages[index]) {
      setEditingMessage({ section, index, content: messages[index].content });
    }
  };

  const saveEditedMessage = () => {
    if (localScenario && editingMessage) {
      const { section, index, content } = editingMessage;
      const messages = section === "conversation" ? [...localScenario.conversationMessages] : [...localScenario.pastSupplierConversation];
      messages[index] = { ...messages[index], content };
      setLocalScenario({
        ...localScenario,
        [section === "conversation" ? "conversationMessages" : "pastSupplierConversation"]: messages,
      });
    }
    setEditingMessage(null);
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
  };

  const deleteMessage = (section: MessageSection, index: number) => {
    if (!localScenario) return;
    if (section === "conversation") {
      const messages = localScenario.conversationMessages.filter((_, i) => i !== index);
      setLocalScenario({ ...localScenario, conversationMessages: messages });
    } else {
      const messages = localScenario.pastSupplierConversation.filter((_, i) => i !== index);
      setLocalScenario({ ...localScenario, pastSupplierConversation: messages });
    }
  };

  const startAddingMessage = (section: MessageSection) => {
    setAddingMessageTo(section);
    setNewMessageRole("user");
    setNewMessageContent("");
  };

  const addMessage = () => {
    if (!localScenario || !newMessageContent.trim()) return;
    const newMsg: ChatMessage = { role: newMessageRole, content: newMessageContent.trim() };
    if (addingMessageTo === "conversation") {
      setLocalScenario({
        ...localScenario,
        conversationMessages: [...localScenario.conversationMessages, newMsg],
      });
    } else {
      setLocalScenario({
        ...localScenario,
        pastSupplierConversation: [...localScenario.pastSupplierConversation, newMsg],
      });
    }
    setAddingMessageTo(null);
    setNewMessageContent("");
  };

  const cancelAddMessage = () => {
    setAddingMessageTo(null);
    setNewMessageContent("");
  };

  const handleUpdateOnly = () => {
    if (localScenario) {
      onUpdateOnly({
        id: localScenario.id,
        name: localScenario.name,
        conversationMessages: localScenario.conversationMessages,
        srData: localScenario.srData,
        pastSupplierConversation: localScenario.pastSupplierConversation,
      });
    }
  };

  const handleUpdateAndLoad = () => {
    if (localScenario) {
      onUpdateAndLoad({
        id: localScenario.id,
        name: localScenario.name,
        conversationMessages: localScenario.conversationMessages,
        srData: localScenario.srData,
        pastSupplierConversation: localScenario.pastSupplierConversation,
      });
    }
  };

  const formatJson = (obj: unknown) => JSON.stringify(obj, null, 2);

  if (!scenario) return null;
  if (!localScenario) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif tracking-tight text-stone-900 dark:text-stone-100">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-2 py-1 text-xl font-serif tracking-tight border border-stone-300 rounded-lg bg-white dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") cancelEditName();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={saveName} className="h-8 px-2 bg-orange-600 hover:bg-orange-700 text-white">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditName} className="h-8 px-2">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span>{localScenario.name}</span>
                  <button
                    onClick={startEditingName}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-opacity"
                  >
                    <Edit size={14} />
                  </button>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-stone-500 dark:text-stone-400">
              Created: {new Date(localScenario.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
          {/* Customer-Bot Conversation */}
          <Collapsible
            open={expandedSections.conversation}
            onOpenChange={() => toggleSection("conversation")}
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/70 dark:border-stone-800/50 dark:bg-stone-900/70">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <MessageSquare size={14} />
                  </div>
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    Customer-Bot Conversation
                  </span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {localScenario.conversationMessages.length} messages
                  </Badge>
                </div>
                {expandedSections.conversation ? (
                  <ChevronUp size={14} className="text-stone-500" />
                ) : (
                  <ChevronDown size={14} className="text-stone-500" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-stone-200 p-4 dark:border-stone-700">
                  {localScenario.conversationMessages.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto">
                        {localScenario.conversationMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex gap-2 w-full",
                              msg.role === "user" ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white text-xs",
                                msg.role === "user"
                                  ? "bg-gradient-to-br from-orange-500 to-amber-500"
                                  : "bg-stone-500 dark:bg-stone-600",
                              )}
                            >
                              <Play size={10} className={msg.role === "user" ? "rotate-90" : "-rotate-90"} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                              {editingMessage?.section === "conversation" && editingMessage.index === idx ? (
                                <div className="flex flex-col gap-2 w-full min-w-0 max-w-full">
                                  <textarea
                                    value={editingMessage.content}
                                    onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                                    className="w-full rounded-xl px-3 py-2 text-xs leading-relaxed border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" variant="ghost" onClick={cancelEditMessage} className="h-6 px-2 text-xs">
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={saveEditedMessage} className="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className={cn(
                                      "rounded-xl px-3 py-2 text-xs leading-relaxed",
                                      msg.role === "user"
                                        ? "rounded-tr-none bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                                        : "rounded-tl-none bg-stone-50 border border-stone-100 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300",
                                    )}
                                  >
                                    {msg.content}
                                  </div>
                                  <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditingMessage("conversation", idx)}
                                      className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                                    >
                                      <Edit size={10} />
                                    </button>
                                    <button
                                      onClick={() => deleteMessage("conversation", idx)}
                                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-stone-500 hover:text-red-600"
                                    >
                                      <Check size={10} className="text-red-500" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {addingMessageTo === "conversation" ? (
                        <div className="mt-3 p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                          <div className="flex gap-2 mb-2">
                            <Button
                              size="sm"
                              variant={newMessageRole === "user" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("user")}
                              className={cn("h-7 text-xs", newMessageRole === "user" ? "bg-orange-600 hover:bg-orange-700" : "")}
                            >
                              Customer
                            </Button>
                            <Button
                              size="sm"
                              variant={newMessageRole === "assistant" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("assistant")}
                              className={cn("h-7 text-xs", newMessageRole === "assistant" ? "bg-stone-600 hover:bg-stone-700" : "")}
                            >
                              Bot
                            </Button>
                          </div>
                          <textarea
                            value={newMessageContent}
                            onChange={(e) => setNewMessageContent(e.target.value)}
                            placeholder="Enter message..."
                            className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-1 mt-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={cancelAddMessage} className="h-7 text-xs">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={addMessage} className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                              Add
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex justify-between">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startAddingMessage("conversation")}
                            className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 h-7"
                          >
                            <MessageSquare size={12} className="mr-1" />Add Message
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                localScenario.conversationMessages.map((m) => `${m.role}: ${m.content}`).join("\n"),
                                "conversation",
                              )
                            }
                            className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 h-7"
                          >
                            {copiedSection === "conversation" ? (
                              <><Check size={12} className="mr-1" />Copied!</>
                            ) : (
                              <><Copy size={12} className="mr-1" />Copy</>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">No messages</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startAddingMessage("conversation")}
                        className="text-xs"
                      >
                        <MessageSquare size={12} className="mr-1" />Add Message
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* SR Data */}
          <Collapsible
            open={expandedSections.srData}
            onOpenChange={() => toggleSection("srData")}
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/70 dark:border-stone-800/50 dark:bg-stone-900/70">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Database size={14} />
                  </div>
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    SR Data
                  </span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {localScenario.srData.length} item{localScenario.srData.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {expandedSections.srData ? (
                  <ChevronUp size={14} className="text-stone-500" />
                ) : (
                  <ChevronDown size={14} className="text-stone-500" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-stone-200 p-4 dark:border-stone-700">
                  {localScenario.srData.length > 0 ? (
                    <>
                      <div className="max-h-[200px] overflow-y-auto rounded-lg bg-stone-50 p-3 font-mono text-xs text-stone-700 dark:bg-stone-950 dark:text-stone-300">
                        <pre>{formatJson(localScenario.srData)}</pre>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(formatJson(localScenario.srData), "srData")}
                          className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 h-7"
                        >
                          {copiedSection === "srData" ? (
                            <><Check size={12} className="mr-1" />Copied!</>
                          ) : (
                            <><Copy size={12} className="mr-1" />Copy JSON</>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400 dark:text-stone-500">No SR data</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Past Supplier Conversation */}
          <Collapsible
            open={expandedSections.supplierChat}
            onOpenChange={() => toggleSection("supplierChat")}
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white/70 dark:border-stone-800/50 dark:bg-stone-900/70">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <MessageCircle size={14} />
                  </div>
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    Past Supplier Conversation
                  </span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {localScenario.pastSupplierConversation.length} messages
                  </Badge>
                </div>
                {expandedSections.supplierChat ? (
                  <ChevronUp size={14} className="text-stone-500" />
                ) : (
                  <ChevronDown size={14} className="text-stone-500" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-stone-200 p-4 dark:border-stone-700">
                  {localScenario.pastSupplierConversation.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto">
                        {localScenario.pastSupplierConversation.map((msg, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex gap-2 w-full",
                              msg.role === "user" ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white text-xs",
                                msg.role === "user"
                                  ? "bg-gradient-to-br from-orange-500 to-amber-500"
                                  : "bg-stone-500 dark:bg-stone-600",
                              )}
                            >
                              <Play size={10} className={msg.role === "user" ? "rotate-90" : "-rotate-90"} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                              {editingMessage?.section === "supplier" && editingMessage.index === idx ? (
                                <div className="flex flex-col gap-2 w-full min-w-0 max-w-full">
                                  <textarea
                                    value={editingMessage.content}
                                    onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                                    className="w-full rounded-xl px-3 py-2 text-xs leading-relaxed border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" variant="ghost" onClick={cancelEditMessage} className="h-6 px-2 text-xs">
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={saveEditedMessage} className="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className={cn(
                                      "rounded-xl px-3 py-2 text-xs leading-relaxed",
                                      msg.role === "user"
                                        ? "rounded-tr-none bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900"
                                        : "rounded-tl-none bg-stone-50 border border-stone-100 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300",
                                    )}
                                  >
                                    {msg.content}
                                  </div>
                                  <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditingMessage("supplier", idx)}
                                      className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                                    >
                                      <Edit size={10} />
                                    </button>
                                    <button
                                      onClick={() => deleteMessage("supplier", idx)}
                                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-stone-500 hover:text-red-600"
                                    >
                                      <Check size={10} className="text-red-500" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {addingMessageTo === "supplier" ? (
                        <div className="mt-3 p-3 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50">
                          <div className="flex gap-2 mb-2">
                            <Button
                              size="sm"
                              variant={newMessageRole === "user" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("user")}
                              className={cn("h-7 text-xs", newMessageRole === "user" ? "bg-orange-600 hover:bg-orange-700" : "")}
                            >
                              Customer
                            </Button>
                            <Button
                              size="sm"
                              variant={newMessageRole === "assistant" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("assistant")}
                              className={cn("h-7 text-xs", newMessageRole === "assistant" ? "bg-stone-600 hover:bg-stone-700" : "")}
                            >
                              Bot
                            </Button>
                          </div>
                          <textarea
                            value={newMessageContent}
                            onChange={(e) => setNewMessageContent(e.target.value)}
                            placeholder="Enter message..."
                            className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-1 mt-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={cancelAddMessage} className="h-7 text-xs">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={addMessage} className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white">
                              Add
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex justify-between">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startAddingMessage("supplier")}
                            className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 h-7"
                          >
                            <MessageCircle size={12} className="mr-1" />Add Message
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                localScenario.pastSupplierConversation.map((m) => `${m.role}: ${m.content}`).join("\n"),
                                "supplierChat",
                              )
                            }
                            className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 h-7"
                          >
                            {copiedSection === "supplierChat" ? (
                              <><Check size={12} className="mr-1" />Copied!</>
                            ) : (
                              <><Copy size={12} className="mr-1" />Copy</>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">No supplier messages</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startAddingMessage("supplier")}
                        className="text-xs"
                      >
                        <MessageCircle size={12} className="mr-1" />Add Message
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <DialogFooter className="px-6 py-4 border-t-0 bg-transparent m-0">
          <Button
            size="lg"
            variant="outline"
            onClick={handleUpdateOnly}
            disabled={isUpdating}
            className="border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <Edit size={16} className="mr-2" />
            Update Only
          </Button>
          <Button
            size="lg"
            onClick={handleUpdateAndLoad}
            disabled={isUpdating}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
          >
            <Edit size={16} className="mr-2" />
            Update + Load Playground
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}