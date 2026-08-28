"use client";
// Glass — editor de texto enriquecido del CMS (§11.1). El usuario ve botones, no
// markdown. Serializa a `RichNode[]` y el servidor re-sanea al guardar.
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import {
  type RichInline,
  type RichNode,
  type RichText,
  sanitizeRichText,
} from "@/domain/rich-text";

function serializeInlines(parent: Node): RichInline[] {
  const out: RichInline[] = [];
  const walk = (node: Node, marks: Omit<RichInline, "text">) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) out.push({ text, ...marks });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const next = { ...marks };
    const tag = el.tagName;
    if (tag === "B" || tag === "STRONG") next.bold = true;
    if (tag === "I" || tag === "EM") next.italic = true;
    if (tag === "A") {
      const href = el.getAttribute("href");
      if (href) next.href = href;
    }
    el.childNodes.forEach((c) => {
      walk(c, next);
    });
  };
  parent.childNodes.forEach((c) => {
    walk(c, {});
  });
  return out;
}

function serialize(root: HTMLElement): RichText {
  const nodes: RichNode[] = [];
  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? "";
      if (text.trim()) nodes.push({ type: "p", children: [{ text }] });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    if (el.tagName === "UL" || el.tagName === "OL") {
      const items: RichInline[][] = [];
      el.querySelectorAll(":scope > li").forEach((li) => {
        items.push(serializeInlines(li));
      });
      if (items.length) {
        nodes.push({ type: el.tagName === "OL" ? "ol" : "ul", items });
      }
      return;
    }
    const children = serializeInlines(el);
    if (children.length) nodes.push({ type: "p", children });
  });
  return sanitizeRichText(nodes);
}

function render(value: RichText): string {
  const inline = (parts: RichInline[]) =>
    parts
      .map((p) => {
        let t = p.text.replace(/</g, "&lt;");
        if (p.bold) t = `<strong>${t}</strong>`;
        if (p.italic) t = `<em>${t}</em>`;
        if (p.href) t = `<a href="${p.href.replace(/"/g, "&quot;")}">${t}</a>`;
        return t;
      })
      .join("");
  return value
    .map((n) =>
      n.type === "p"
        ? `<p>${inline(n.children)}</p>`
        : `<${n.type}>${n.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${n.type}>`,
    )
    .join("");
}

export function RichTextEditor({
  value,
  onChange,
  label,
}: {
  value: RichText;
  onChange: (v: RichText) => void;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML === "") el.innerHTML = render(value) || "<p></p>";
    // Se hidrata una sola vez; después manda el DOM.
  }, [value]);

  const emit = () => ref.current && onChange(serialize(ref.current));

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium" id={id}>
          {label}
        </span>
      )}
      <div className="flex gap-1 rounded-t-md border border-b-0 bg-muted/50 p-1">
        <Tool onClick={() => cmd("bold")} icon={<Bold className="size-4" />} />
        <Tool
          onClick={() => cmd("italic")}
          icon={<Italic className="size-4" />}
        />
        <Tool
          onClick={() => {
            const url = window.prompt("Enlace (https://…)");
            if (url) cmd("createLink", url);
          }}
          icon={<Link2 className="size-4" />}
        />
        <Tool
          onClick={() => cmd("insertUnorderedList")}
          icon={<List className="size-4" />}
        />
        <Tool
          onClick={() => cmd("insertOrderedList")}
          icon={<ListOrdered className="size-4" />}
        />
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-labelledby={label ? id : undefined}
        onInput={emit}
        onBlur={emit}
        className="min-h-24 rounded-b-md border p-3 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-ring [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

function Tool({
  onClick,
  icon,
}: {
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded p-1.5 hover:bg-background"
    >
      {icon}
    </button>
  );
}
