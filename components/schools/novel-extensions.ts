import {
  TiptapImage,
  TiptapLink,
  TaskList,
  TaskItem,
  StarterKit,
} from "novel";
import Placeholder from "@tiptap/extension-placeholder";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { cn } from "@/lib/utils";

// Placeholder config
const placeholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return `Heading ${node.attrs.level}`;
    }
    return "Write something, or type '/' for commands...";
  },
  includeChildren: true,
});

// Image config
const tiptapImage = TiptapImage.configure({
  allowBase64: true,
  HTMLAttributes: {
    class: cn("rounded-xl border border-border-subtle max-w-full"),
  },
});

// Link config  
const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cn(
      "text-accent-primary underline underline-offset-4",
      "hover:text-accent-primary/80 transition-colors cursor-pointer"
    ),
  },
});

// Task list config
const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cn("not-prose pl-2"),
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: cn("flex items-start gap-2 my-1"),
  },
  nested: true,
});

// Horizontal rule
const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cn("mt-4 mb-6 border-t border-border-medium"),
  },
});

// StarterKit config (basic formatting)
const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cn("list-disc list-outside ml-4"),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cn("list-decimal list-outside ml-4"),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cn("my-1"),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cn("border-l-4 border-accent-primary/30 pl-4 italic text-text-muted"),
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: cn(
        "rounded-xl bg-bg-sidebar p-4 font-mono text-sm text-text-main",
        "border border-border-subtle"
      ),
    },
  },
  code: {
    HTMLAttributes: {
      class: cn(
        "rounded-md bg-bg-sidebar px-1.5 py-0.5 font-mono text-sm",
        "before:content-none after:content-none"
      ),
    },
  },
  horizontalRule: false, // Using custom one
  dropcursor: {
    color: "var(--accent-primary)",
    width: 4,
  },
  gapcursor: false,
});

// Export all extensions
export const defaultExtensions = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  taskList,
  taskItem,
  horizontalRule,
];
