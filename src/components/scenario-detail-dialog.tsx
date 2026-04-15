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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-card">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold tracking-tight text-foreground">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-base font-serif font-bold tracking-tight border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") cancelEditName();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={saveName} className="h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditName} className="h-9 px-3 text-muted-foreground hover:text-foreground">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span>{localScenario.name}</span>
                  <button
                    onClick={startEditingName}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground active:scale-95"
                  >
                    <Edit size={14} />
                  </button>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
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
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/5">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare size={14} />
                  </div>
                  <span className="text-sm font-serif font-bold text-foreground">
                    Customer-Bot Conversation
                  </span>
                  <Badge variant="secondary" className="ml-1 text-[10px] font-bold uppercase tracking-wider">
                    {localScenario.conversationMessages.length} messages
                  </Badge>
                </div>
                {expandedSections.conversation ? (
                  <ChevronUp size={14} className="text-muted-foreground/60" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground/60" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border p-4 bg-background/50">
                  {localScenario.conversationMessages.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
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
                                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full shadow-sm text-xs transition-colors",
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
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
                                    className="w-full rounded-xl px-3 py-2 text-xs leading-relaxed border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex gap-1.5 justify-end">
                                    <Button size="sm" variant="ghost" onClick={cancelEditMessage} className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground">
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={saveEditedMessage} className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className={cn(
                                      "rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm transition-all duration-200",
                                      msg.role === "user"
                                        ? "rounded-tr-none bg-primary text-primary-foreground"
                                        : "rounded-tl-none bg-card border border-border text-foreground",
                                    )}
                                  >
                                    {msg.content}
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditingMessage("conversation", idx)}
                                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                                    >
                                      <Edit size={10} />
                                    </button>
                                    <button
                                      onClick={() => deleteMessage("conversation", idx)}
                                      className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                                    >
                                      <Check size={10} className="text-destructive" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {addingMessageTo === "conversation" ? (
                        <div className="mt-4 p-4 border border-border rounded-xl bg-muted/20">
                          <div className="flex gap-2 mb-3">
                            <Button
                              size="sm"
                              variant={newMessageRole === "user" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("user")}
                              className={cn("h-7 px-3 text-[10px] font-bold uppercase tracking-wider", newMessageRole === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                            >
                              Customer
                            </Button>
                            <Button
                              size="sm"
                              variant={newMessageRole === "assistant" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("assistant")}
                              className={cn("h-7 px-3 text-[10px] font-bold uppercase tracking-wider", newMessageRole === "assistant" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                            >
                              Bot
                            </Button>
                          </div>
                          <textarea
                            value={newMessageContent}
                            onChange={(e) => setNewMessageContent(e.target.value)}
                            placeholder="Enter message..."
                            className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all resize-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-1.5 mt-3 justify-end">
                            <Button size="sm" variant="ghost" onClick={cancelAddMessage} className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={addMessage} className="h-8 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                              Add Message
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex justify-between">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startAddingMessage("conversation")}
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground h-8 px-3"
                          >
                            <MessageSquare size={12} className="mr-1.5" />
                            Add Message
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
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground h-8 px-3"
                          >
                            {copiedSection === "conversation" ? (
                              <><Check size={12} className="mr-1.5 text-success" />Copied!</>
                            ) : (
                              <><Copy size={12} className="mr-1.5" />Copy Transcript</>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground mb-4">No messages yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startAddingMessage("conversation")}
                        className="text-[10px] font-bold uppercase tracking-wider border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <MessageSquare size={12} className="mr-1.5" />
                        Add First Message
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
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/5">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Database size={14} />
                  </div>
                  <span className="text-sm font-serif font-bold text-foreground">
                    SR Data
                  </span>
                  <Badge variant="secondary" className="ml-1 text-[10px] font-bold uppercase tracking-wider">
                    {localScenario.srData.length} item{localScenario.srData.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {expandedSections.srData ? (
                  <ChevronUp size={14} className="text-muted-foreground/60" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground/60" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border p-4 bg-background/50">
                  {localScenario.srData.length > 0 ? (
                    <>
                      <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border bg-background p-4 font-mono text-xs text-foreground/80 leading-relaxed scrollbar-thin scrollbar-thumb-border">
                        <pre>{formatJson(localScenario.srData)}</pre>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(formatJson(localScenario.srData), "srData")}
                          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground h-8 px-3"
                        >
                          {copiedSection === "srData" ? (
                            <><Check size={12} className="mr-1.5 text-success" />Copied!</>
                          ) : (
                            <><Copy size={12} className="mr-1.5" />Copy JSON</>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No SR data</p>
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
            <div className="overflow-hidden rounded-2xl border border-border bg-muted/5">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageCircle size={14} />
                  </div>
                  <span className="text-sm font-serif font-bold text-foreground">
                    Past Supplier Conversation
                  </span>
                  <Badge variant="secondary" className="ml-1 text-[10px] font-bold uppercase tracking-wider">
                    {localScenario.pastSupplierConversation.length} messages
                  </Badge>
                </div>
                {expandedSections.supplierChat ? (
                  <ChevronUp size={14} className="text-muted-foreground/60" />
                ) : (
                  <ChevronDown size={14} className="text-muted-foreground/60" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border p-4 bg-background/50">
                  {localScenario.pastSupplierConversation.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
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
                                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full shadow-sm text-xs transition-colors",
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
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
                                    className="w-full rounded-xl px-3 py-2 text-xs leading-relaxed border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all resize-none"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex gap-1.5 justify-end">
                                    <Button size="sm" variant="ghost" onClick={cancelEditMessage} className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground">
                                      Cancel
                                    </Button>
                                    <Button size="sm" onClick={saveEditedMessage} className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className={cn(
                                      "rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm transition-all duration-200",
                                      msg.role === "user"
                                        ? "rounded-tr-none bg-primary text-primary-foreground"
                                        : "rounded-tl-none bg-card border border-border text-foreground",
                                    )}
                                  >
                                    {msg.content}
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditingMessage("supplier", idx)}
                                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                                    >
                                      <Edit size={10} />
                                    </button>
                                    <button
                                      onClick={() => deleteMessage("supplier", idx)}
                                      className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                                    >
                                      <Check size={10} className="text-destructive" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {addingMessageTo === "supplier" ? (
                        <div className="mt-4 p-4 border border-border rounded-xl bg-muted/20">
                          <div className="flex gap-2 mb-3">
                            <Button
                              size="sm"
                              variant={newMessageRole === "user" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("user")}
                              className={cn("h-7 px-3 text-[10px] font-bold uppercase tracking-wider", newMessageRole === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                            >
                              Customer
                            </Button>
                            <Button
                              size="sm"
                              variant={newMessageRole === "assistant" ? "default" : "outline"}
                              onClick={() => setNewMessageRole("assistant")}
                              className={cn("h-7 px-3 text-[10px] font-bold uppercase tracking-wider", newMessageRole === "assistant" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                            >
                              Bot
                            </Button>
                          </div>
                          <textarea
                            value={newMessageContent}
                            onChange={(e) => setNewMessageContent(e.target.value)}
                            placeholder="Enter message..."
                            className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all resize-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-1.5 mt-3 justify-end">
                            <Button size="sm" variant="ghost" onClick={cancelAddMessage} className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                              Cancel
                            </Button>
                            <Button size="sm" onClick={addMessage} className="h-8 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                              Add Message
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex justify-between">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startAddingMessage("supplier")}
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground h-8 px-3"
                          >
                            <MessageCircle size={12} className="mr-1.5" />
                            Add Message
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
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground h-8 px-3"
                          >
                            {copiedSection === "supplierChat" ? (
                              <><Check size={12} className="mr-1.5 text-success" />Copied!</>
                            ) : (
                              <><Copy size={12} className="mr-1.5" />Copy Transcript</>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground mb-4">No supplier messages yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startAddingMessage("supplier")}
                        className="text-[10px] font-bold uppercase tracking-wider border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <MessageCircle size={12} className="mr-1.5" />
                        Add First Message
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 m-0">
          <Button
            size="lg"
            variant="outline"
            onClick={handleUpdateOnly}
            disabled={isUpdating}
            className="flex-1 sm:flex-none border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Edit size={16} className="mr-2" />
            Update Only
          </Button>
          <Button
            size="lg"
            onClick={handleUpdateAndLoad}
            disabled={isUpdating}
            className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm"
          >
            <Edit size={16} className="mr-2" />
            Update + Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}