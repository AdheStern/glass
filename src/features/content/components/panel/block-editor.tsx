"use client";
// Glass — editor de bloques con arrastre (§11). Reordena con @dnd-kit; cada
// bloque tiene su formulario plegable.
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BLOCKS } from "../../blocks/registry";
import { BLOCK_TYPES, type BlockType } from "../../blocks/schemas";
import { BlockForm } from "./block-form";

export interface EditorBlock {
  key: string;
  type: BlockType;
  data: unknown;
}

function Row({
  block,
  open,
  onToggle,
  onData,
  onRemove,
}: {
  block: EditorBlock;
  open: boolean;
  onToggle: () => void;
  onData: (d: unknown) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-card">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
          onClick={onToggle}
        >
          <ChevronDown
            className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          {BLOCKS[block.type].label}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {open && (
        <div className="border-t p-3">
          <BlockForm type={block.type} data={block.data} onChange={onData} />
        </div>
      )}
    </div>
  );
}

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: EditorBlock[];
  onChange: (b: EditorBlock[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(blocks[0]?.key ?? null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function dragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const from = blocks.findIndex((b) => b.key === active.id);
      const to = blocks.findIndex((b) => b.key === over.id);
      onChange(arrayMove(blocks, from, to));
    }
  }

  function add(type: BlockType) {
    const key = crypto.randomUUID();
    onChange([...blocks, { key, type, data: BLOCKS[type].defaultData }]);
    setOpen(key);
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={dragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {blocks.map((b) => (
              <Row
                key={b.key}
                block={b}
                open={open === b.key}
                onToggle={() => setOpen(open === b.key ? null : b.key)}
                onData={(d) =>
                  onChange(
                    blocks.map((x) =>
                      x.key === b.key ? { ...x, data: d } : x,
                    ),
                  )
                }
                onRemove={() => onChange(blocks.filter((x) => x.key !== b.key))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            <Plus className="mr-1 size-4" /> Agregar bloque
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {BLOCK_TYPES.map((t) => (
            <DropdownMenuItem key={t} onClick={() => add(t)}>
              {BLOCKS[t].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
