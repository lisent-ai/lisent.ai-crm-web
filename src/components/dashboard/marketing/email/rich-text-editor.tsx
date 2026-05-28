"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  className?: string;
};

// RichTextEditor exposes two side-by-side modes operators pick between
// from a prominent tab strip at the top:
//
//   ✎ Visual    — TipTap WYSIWYG with toolbar (default)
//   </> HTML    — monospace textarea, raw HTML stays as-typed
//
// Auto-switch: pasting an email template that contains a <style> block,
// <head>, <!DOCTYPE>, or a <link rel="stylesheet"> flips to HTML mode
// automatically and preserves the raw HTML verbatim. Without that the
// previous behavior was "TipTap silently strips the CSS, preview looks
// empty, operator stares at it confused".
//
// Value is the source of truth and stays as raw HTML across mode flips.
// The preview iframe always renders the raw value via srcDoc.
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  onPickImage,
  className,
}: Readonly<RichTextEditorProps>) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [pasteBanner, setPasteBanner] = useState(false);

  // useEditor binds handlePaste once. To call the latest onChange/setMode
  // from inside that closure we route through a ref so we always see
  // the most recent handler — without this the auto-switch would
  // silently use stale state.
  const onComplexPasteRef = useRef<(html: string) => void>(() => {});
  onComplexPasteRef.current = (html: string) => {
    onChange(html);
    setMode("html");
    setPasteBanner(true);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { class: "max-w-full h-auto" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[300px] focus:outline-none px-3 py-2 prose prose-sm max-w-none text-[var(--text-primary)]",
      },
      handlePaste: (_view, event) => {
        const html = event.clipboardData?.getData("text/html") ?? "";
        // Detect the markers TipTap can't render meaningfully — a full
        // HTML document, an external stylesheet, or a <style> block.
        if (html && /<(style|head|body|!doctype|link\s[^>]*stylesheet)/i.test(html)) {
          event.preventDefault();
          onComplexPasteRef.current(html);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Only sync from editor → value when actually in visual mode.
      // In HTML mode the textarea owns the value and the editor is
      // hidden / stale; emitting here would clobber the operator's
      // raw HTML with TipTap's cleaned version.
      if (mode === "visual") {
        onChange(ed.getHTML());
      }
    },
  });

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
      <ModeTabs mode={mode} onChange={setMode} />
      {pasteBanner && mode === "html" && (
        <div className="border-b border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent)]">
          🪄 Detected a styled HTML paste — switched to HTML mode so all
          styles survive. Use the Visual tab to go back.
        </div>
      )}
      {mode === "visual" ? (
        <>
          <Toolbar editor={editor} onPickImage={onPickImage} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ?? "<p>Paste your HTML here. Preview will render it.</p>"
          }
          className="min-h-[300px] flex-1 resize-none border-0 bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] focus:outline-none"
          spellCheck={false}
        />
      )}
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: Readonly<{
  mode: "visual" | "html";
  onChange: (m: "visual" | "html") => void;
}>) {
  const tabBtn = (active: boolean) =>
    `flex-1 px-4 py-2.5 text-sm transition border-b-2 ${
      active
        ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
        : "border-transparent text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
    }`;
  return (
    <div className="flex border-b border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={() => onChange("visual")}
        className={tabBtn(mode === "visual")}
      >
        ✎ Visual editor
      </button>
      <button
        type="button"
        onClick={() => onChange("html")}
        className={tabBtn(mode === "html")}
      >
        {"</> HTML code"}
      </button>
    </div>
  );
}

function Toolbar({
  editor,
  onPickImage,
}: Readonly<{
  editor: Editor;
  onPickImage?: () => Promise<string | null>;
}>) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previous ?? "https://");
    if (url === null) return;
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
    const tag = window.prompt("Merge tag (e.g. FNAME)", "FNAME");
    if (!tag || tag.trim() === "") return;
    editor.chain().focus().insertContent(`*|${tag.trim()}|*`).run();
  }, [editor]);

  const btn = (active: boolean) =>
    `rounded-md px-2 py-1 text-xs font-medium transition ${
      active
        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] px-2 py-1.5">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
        title="Bold (Cmd+B)"
      >
        <b>B</b>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
        title="Italic (Cmd+I)"
      >
        <i>I</i>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <ToolbarDivider />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
        title="Heading 3"
      >
        H3
      </button>
      <ToolbarDivider />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
        title="Bullet list"
      >
        •
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
        title="Numbered list"
      >
        1.
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive("blockquote"))}
        title="Quote"
      >
        ❝
      </button>
      <ToolbarDivider />
      <button type="button" onClick={setLink} className={btn(editor.isActive("link"))} title="Link">
        🔗
      </button>
      <button type="button" onClick={insertImage} className={btn(false)} title="Image">
        🖼
      </button>
      <button type="button" onClick={insertMergeTag} className={btn(false)} title="Insert merge tag">
        {"{{ }}"}
      </button>
      <ToolbarDivider />
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btn(false)}
        title="Divider"
      >
        ―
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        className={btn(false)}
        title="Undo (Cmd+Z)"
      >
        ↶
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        className={btn(false)}
        title="Redo (Cmd+Shift+Z)"
      >
        ↷
      </button>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-4 w-px bg-[var(--border-subtle)]" aria-hidden="true" />;
}

export { TemplatePreviewFrame };
