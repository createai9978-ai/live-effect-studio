import { useEffect, useRef, useState, type ElementType } from "react";
import { cn } from "../utils/cn";
import { useAdmin } from "./AdminContext";

/**
 * Text that an admin can rewrite inline. Renders plain text for normal users;
 * in Admin Mode a pencil appears and the node becomes contenteditable.
 */
export default function EditableText({
  id,
  text,
  as: Tag = "span",
  className,
  pencilClassName,
}: {
  id: string;
  text: string;
  as?: ElementType;
  className?: string;
  pencilClassName?: string;
}) {
  const { adminMode, labelFor, setLabel } = useAdmin();
  const value = labelFor(id, text);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editing || !ref.current) return;
    const el = ref.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  useEffect(() => {
    if (!adminMode) setEditing(false);
  }, [adminMode]);

  const commit = () => {
    const next = (ref.current?.textContent ?? "").trim();
    setLabel(id, next.length ? next : text);
    setEditing(false);
  };

  if (!adminMode) return <Tag className={className}>{value}</Tag>;

  return (
    <span className="group/edit relative inline-flex max-w-full items-center gap-1">
      <Tag
        ref={ref as never}
        contentEditable={editing}
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            if (ref.current) ref.current.textContent = value;
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onDoubleClick={() => setEditing(true)}
        className={cn(
          className,
          "rounded outline-none transition",
          editing
            ? "bg-[var(--nova-accent,#00E5FF)]/10 px-1 ring-1 ring-[var(--nova-accent,#00E5FF)]/60"
            : "ring-1 ring-dashed ring-[var(--nova-accent,#00E5FF)]/25 hover:ring-[var(--nova-accent,#00E5FF)]/60"
        )}
      >
        {value}
      </Tag>
      <button
        type="button"
        title="Edit this text"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
        className={cn(
          "shrink-0 rounded p-0.5 text-[var(--nova-accent,#00E5FF)] opacity-60 transition hover:opacity-100",
          pencilClassName
        )}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>
    </span>
  );
}
