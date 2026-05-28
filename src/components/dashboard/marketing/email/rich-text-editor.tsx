"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";

import { TemplatePreviewFrame } from "./template-preview-frame";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  // Optional callback the parent wires to "Insert image" — Round 2 will
  // hand this an uploader that goes through Mailchimp's File Manager API
  // and resolves with a hosted URL. Without it, the toolbar shows a prompt
  // for a manual URL paste so operators are never stuck without an image.
  onPickImage?: () => Promise<string | null>;
  showHtmlToggle?: boolean;
  className?: string;
};

// RichTextEditor is the Mailchimp-quality replacement for the raw HTML
// textarea operators were forced to use in Steps 11-12. Three goals:
//
//   1. Bold / italic / underline / lists / headings / links / images
//      with one-click toolbar buttons — Word/Pages-style editing, not
//      "memorize HTML".
//   2. Live HTML view: the value prop stays HTML so the existing
//      template + campaign-content endpoints don't change — Mailchimp
//      receives the same shape it always did.
//   3. Side-by-side raw-HTML escape hatch via the showHtmlToggle option
//      for operators who want to paste pre-built HTML (e.g. agency-
//      designed templates).
//
// TipTap was picked over Lexical / ProseMirror-direct because the
// extension surface (StarterKit + Link + Image) covers what email needs
// without a content-model rewrite per node type.
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  onPickImage,
  showHtmlToggle = true,
  className,
}: Readonly<RichTextEditorProps>) {
  // WYSIWYG by default; flip to HTML for pasting full email templates
  // (TipTap's parser keeps <p>/<a>/<img>/etc. but strips <style> blocks
  // and unknown classes — HTML mode bypasses the parser entirely).
  const [mode, setMode] = useState<"wysiwyg" | "html">("wysiwyg");
  const editor = useEditor({
    // Disable SSR so Next.js doesn't hydrate the editor server-side —
    // TipTap's contenteditable wiring is browser-only.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        // Linkify operator-typed URLs as they paste them, not just from
        // the toolbar's Insert-link button.
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        // Mailchimp's File Manager hosts these URLs; we trust them to be
        // safe-as-image. allowBase64 means the image button can also
        // embed a data:URI inline before upload (useful for previews).
        allowBase64: true,
        HTMLAttributes: { class: "max-w-full h-auto" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        // prose classes give us reasonable type rendering without an
        // extra Tailwind plugin; tweak per-token if the theme needs it.
        class:
          "min-h-[300px] focus:outline-none px-3 py-2 prose prose-sm max-w-none text-[var(--text-primary)]",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync the editor when the value prop changes from outside (e.g. when
  // the campaign create modal applies a template body). We compare with
  // the current editor HTML to avoid an infinite loop with onUpdate.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[300px] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        "flex flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)]"
      }
    >
      <Toolbar
        editor={editor}
        mode={mode}
        onToggleMode={() => setMode((m) => (m === "wysiwyg" ? "html" : "wysiwyg"))}
        onPickImage={onPickImage}
        showHtmlToggle={showHtmlToggle}
      />
      {mode === "wysiwyg" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ?? "<p>Paste raw HTML here. Preview will render it.</p>"
          }
          className="min-h-[300px] flex-1 resize-none border-0 bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}

type ToolbarProps = {
  editor: Editor;
  mode: "wysiwyg" | "html";
  onToggleMode: () => void;
  onPickImage?: () => Promise<string | null>;
  showHtmlToggle?: boolean;
};

function Toolbar({
  editor,
  mode,
  onToggleMode,
  onPickImage,
  showHtmlToggle,
}: Readonly<ToolbarProps>) {
  const inHtml = mode === "html";
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previous ?? "https://");
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(async () => {
    let url: string | null = null;
    if (onPickImage) {
      url = await onPickImage();
    } else {
      url = window.prompt("Image URL", "https://");
    }
    if (!url || url.trim() === "") return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  }, [editor, onPickImage]);

  const insertMergeTag = useCallback(() => {
    // Mailchimp merge tags surface as plain text; operators don't need
    // a rich-text node type for them. Common defaults are FNAME / LNAME
    // with a default fallback like {{FNAME|there}}.
    const tag = window.prompt("Merge tag (e.g. FNAME)", "FNAME");
    if (!tag || tag.trim() === "") return;
    const fallback = window.prompt("Fallback value (optional)", "there") ?? "";
    const literal = fallback
      ? `*|${tag.trim()}|*`
      : `*|${tag.trim()}|*`;
    // Mailchimp's documented merge tag format is `*|TAG|*` with the
    // fallback handled at the API level via the campaign settings;
    // inserting the bare token here is the right shape.
    void literal; // suppress unused warning when refactored
    editor.chain().focus().insertContent(`*|${tag.trim()}|*`).run();
  }, [editor]);

  const btn = (active: boolean) =>
    `rounded-md px-2 py-1 text-xs font-medium transition ${
      inHtml
        ? "cursor-not-allowed text-[var(--text-tertiary)] opacity-40"
        : active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
    }`;

  // In HTML mode, the WYSIWYG buttons are disabled — clicking them
  // through the editor while the textarea is the source-of-truth would
  // produce inconsistent state.
  const guardedClick = (fn: () => void) => () => {
    if (inHtml) return;
    fn();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] px-2 py-1.5">
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
        title="Bold (Cmd+B)"
      >
        <b>B</b>
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
        title="Italic (Cmd+I)"
      >
        <i>I</i>
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <ToolbarDivider />
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
        title="Heading 3"
      >
        H3
      </button>
      <ToolbarDivider />
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
        title="Bullet list"
      >
        •
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
        title="Numbered list"
      >
        1.
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive("blockquote"))}
        title="Quote"
      >
        ❝
      </button>
      <ToolbarDivider />
      <button
        type="button"
        disabled={inHtml} onClick={setLink}
        className={btn(editor.isActive("link"))}
        title="Link"
      >
        🔗
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={insertImage}
        className={btn(false)}
        title="Image (upload or URL)"
      >
        🖼
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={insertMergeTag}
        className={btn(false)}
        title="Insert merge tag — *|FNAME|* style"
      >
        {"{{ }}"}
      </button>
      <ToolbarDivider />
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btn(false)}
        title="Divider"
      >
        ―
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().undo().run()}
        className={btn(false)}
        title="Undo (Cmd+Z)"
      >
        ↶
      </button>
      <button
        type="button"
        disabled={inHtml} onClick={() => editor.chain().focus().redo().run()}
        className={btn(false)}
        title="Redo (Cmd+Shift+Z)"
      >
        ↷
      </button>
      {showHtmlToggle ? (
        <button
          type="button"
          onClick={onToggleMode}
          className={`ml-auto rounded-md px-2 py-1 text-xs font-medium transition ${
            inHtml
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          }`}
          title="Toggle WYSIWYG / HTML source"
        >
          {inHtml ? "✎ Visual" : "</> HTML"}
        </button>
      ) : null}
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-4 w-px bg-[var(--border-subtle)]" aria-hidden="true" />;
}

// Re-export the preview frame for callers that want to keep using the
// side-by-side layout — TipTap edits in place, the preview iframe still
// renders the final HTML for accurate email-client validation.
export { TemplatePreviewFrame };
