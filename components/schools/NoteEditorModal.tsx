"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorCommandList,
  type JSONContent,
} from "novel";
import { defaultExtensions } from "./novel-extensions";
import { cn } from "@/lib/utils";

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  studentSchoolId: string;
  mode: "create" | "edit";
  noteId?: string;
  initialContent?: Record<string, unknown>;
  initialTitle?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EditorCommand = { editor: any };

// Slash command suggestions
const suggestionItems = [
  {
    title: "Heading 1",
    description: "Big section heading",
    searchTerms: ["title", "big", "large", "h1"],
    icon: <span className="text-lg font-bold">H1</span>,
    command: ({ editor }: EditorCommand) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    searchTerms: ["subtitle", "medium", "h2"],
    icon: <span className="text-base font-bold">H2</span>,
    command: ({ editor }: EditorCommand) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple list",
    searchTerms: ["unordered", "point", "ul"],
    icon: <span className="text-lg">•</span>,
    command: ({ editor }: EditorCommand) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    searchTerms: ["ordered", "ol"],
    icon: <span className="text-sm font-medium">1.</span>,
    command: ({ editor }: EditorCommand) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote",
    searchTerms: ["blockquote"],
    icon: <span className="text-lg">"</span>,
    command: ({ editor }: EditorCommand) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: "Image",
    description: "Upload an image",
    searchTerms: ["photo", "picture", "media"],
    icon: <ImageIcon className="w-4 h-4" />,
    command: ({ editor }: EditorCommand) => {
      // Trigger file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Upload to server
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (res.ok) {
            const { url } = await res.json();
            editor.chain().focus().setImage({ src: url }).run();
          }
        }
      };
      input.click();
    },
  },
];

export function NoteEditorModal({
  isOpen,
  onClose,
  onSave,
  studentSchoolId,
  mode,
  noteId,
  initialContent,
  initialTitle,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState<JSONContent | undefined>(
    initialContent as JSONContent | undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const [openNode, setOpenNode] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");
      setContent(initialContent as JSONContent | undefined);
    }
  }, [isOpen, initialTitle, initialContent]);

  const handleSave = async () => {
    if (!content) return;

    setIsSaving(true);
    try {
      const url = mode === "create"
        ? `/api/profile/schools/${studentSchoolId}/notes`
        : `/api/profile/schools/${studentSchoolId}/notes/${noteId}`;
      
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          content,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        console.error("Failed to save note");
      }
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Default empty content
  const defaultContent: JSONContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [],
      },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-float overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-surface rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-text-main">
                {mode === "create" ? "New Note" : "Edit Note"}
              </h2>
              <p className="text-sm text-text-muted">
                Type <span className="bg-bg-sidebar px-1.5 py-0.5 rounded text-xs font-mono">/</span> for commands
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title Input */}
        <div className="p-4 pb-0 flex-shrink-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title (optional)"
            className="w-full text-xl font-display font-bold text-text-main placeholder:text-text-light focus:outline-none"
          />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4">
          <EditorRoot>
            <EditorContent
              immediatelyRender={false}
              initialContent={content || defaultContent}
              extensions={defaultExtensions}
              className="relative min-h-[300px] w-full border-0 bg-transparent prose prose-neutral max-w-none"
              editorProps={{
                handleDrop: (view, event, _slice, moved) => {
                  // Only handle drops that aren't internal moves
                  if (moved) return false;
                  
                  const files = event.dataTransfer?.files;
                  if (!files || files.length === 0) return false;
                  
                  const file = files[0];
                  if (!file.type.startsWith("image/")) return false;
                  
                  // Prevent default browser behavior
                  event.preventDefault();
                  
                  // Upload the image
                  const formData = new FormData();
                  formData.append("file", file);
                  
                  fetch("/api/upload", { method: "POST", body: formData })
                    .then(res => res.json())
                    .then(({ url }) => {
                      if (url) {
                        // Insert image at drop position
                        const { schema } = view.state;
                        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                        const node = schema.nodes.image.create({ src: url });
                        if (coordinates) {
                          const transaction = view.state.tr.insert(coordinates.pos, node);
                          view.dispatch(transaction);
                        }
                      }
                    })
                    .catch(console.error);
                  
                  return true;
                },
                handlePaste: (view, event) => {
                  const items = event.clipboardData?.items;
                  if (!items) return false;
                  
                  for (const item of Array.from(items)) {
                    if (item.type.startsWith("image/")) {
                      event.preventDefault();
                      
                      const file = item.getAsFile();
                      if (!file) continue;
                      
                      const formData = new FormData();
                      formData.append("file", file);
                      
                      fetch("/api/upload", { method: "POST", body: formData })
                        .then(res => res.json())
                        .then(({ url }) => {
                          if (url) {
                            const { schema } = view.state;
                            const node = schema.nodes.image.create({ src: url });
                            const transaction = view.state.tr.replaceSelectionWith(node);
                            view.dispatch(transaction);
                          }
                        })
                        .catch(console.error);
                      
                      return true;
                    }
                  }
                  return false;
                },
                attributes: {
                  class: cn(
                    "prose prose-neutral prose-sm sm:prose-base",
                    "prose-headings:font-display prose-headings:font-bold",
                    "prose-p:text-text-main prose-p:leading-relaxed",
                    "prose-a:text-accent-primary prose-a:no-underline hover:prose-a:underline",
                    "prose-img:rounded-xl prose-img:max-w-full",
                    "focus:outline-none min-h-[200px]"
                  ),
                },
              }}
              onUpdate={({ editor }) => {
                setContent(editor.getJSON());
              }}
            >
              <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-xl border border-border-medium bg-white shadow-lg">
                <EditorCommandEmpty className="px-2 py-1.5 text-sm text-text-muted">
                  No results
                </EditorCommandEmpty>
                <EditorCommandList>
                  {suggestionItems.map((item) => (
                    <EditorCommandItem
                      value={item.title}
                      onCommand={(val) => item.command(val as any)}
                      key={item.title}
                      className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-bg-sidebar rounded-lg cursor-pointer aria-selected:bg-bg-sidebar"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium text-text-main">{item.title}</p>
                        <p className="text-xs text-text-muted">{item.description}</p>
                      </div>
                    </EditorCommandItem>
                  ))}
                </EditorCommandList>
              </EditorCommand>
            </EditorContent>
          </EditorRoot>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle flex-shrink-0">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {mode === "create" ? "Save Note" : "Update Note"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

