// Glass — render determinista de texto enriquecido (§11.1). Nunca HTML crudo.
import { Fragment } from "react";
import type { RichInline, RichText } from "@/domain/rich-text";

function Inline({ node }: { node: RichInline }) {
  let content: React.ReactNode = node.text;
  if (node.bold) content = <strong>{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.href) {
    const external = /^https?:\/\//i.test(node.href);
    content = (
      <a
        href={node.href}
        className="underline"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }
  return <>{content}</>;
}

function Line({ parts }: { parts: RichInline[] }) {
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          <Inline node={p} />
        </Fragment>
      ))}
    </>
  );
}

export function RichTextView({
  value,
  className,
}: {
  value: RichText;
  className?: string;
}) {
  if (!value || value.length === 0) return null;
  return (
    <div className={className ?? "flex flex-col gap-3 leading-relaxed"}>
      {value.map((node, i) => {
        if (node.type === "p") {
          return (
            <p key={i}>
              <Line parts={node.children} />
            </p>
          );
        }
        const ListTag = node.type === "ol" ? "ol" : "ul";
        return (
          <ListTag
            key={i}
            className={
              node.type === "ol" ? "list-decimal pl-5" : "list-disc pl-5"
            }
          >
            {node.items.map((item, j) => (
              <li key={j}>
                <Line parts={item} />
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
