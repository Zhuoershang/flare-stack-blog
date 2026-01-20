import { BubbleMenu } from "@tiptap/react/menus";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns,
  Rows,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

interface TableBubbleMenuProps {
  editor: Editor | null;
}

interface MenuButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isDestructive?: boolean;
  disabled?: boolean;
}

const MenuButton: React.FC<MenuButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  isActive,
  isDestructive,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "h-7 w-7 flex items-center justify-center rounded-sm transition-all duration-200",
      disabled && "opacity-30 cursor-not-allowed",
      !disabled &&
        !isActive &&
        !isDestructive &&
        "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50",
      isActive && "bg-foreground text-background shadow-sm",
      isDestructive &&
        "text-muted-foreground/70 hover:text-red-500 hover:bg-red-500/10",
    )}
    title={label}
    type="button"
  >
    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
  </button>
);

const Separator = () => <div className="h-3.5 w-px bg-border/40 mx-1" />;

export const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={({ editor: currentEditor }: { editor: Editor }) =>
        currentEditor.isActive("table")
      }
      options={{
        placement: "top",
        offset: 8,
      }}
      className="flex items-center p-1 rounded-md border border-border/60 bg-background/95 backdrop-blur-md shadow-lg gap-0.5"
    >
      {/* Column Operations */}
      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          icon={ArrowLeftToLine}
          label="左侧插列"
        />
        <MenuButton
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          icon={ArrowRightToLine}
          label="右侧插列"
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteColumn().run()}
          icon={Columns}
          label="删除列"
          isDestructive
        />
      </div>

      <Separator />

      {/* Row Operations */}
      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().addRowBefore().run()}
          icon={ArrowUpToLine}
          label="上方插行"
        />
        <MenuButton
          onClick={() => editor.chain().focus().addRowAfter().run()}
          icon={ArrowDownToLine}
          label="下方插行"
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteRow().run()}
          icon={Rows}
          label="删除行"
          isDestructive
        />
      </div>

      <Separator />

      {/* Header Toggles */}
      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          isActive={editor.isActive("tableHeader")}
          icon={TableIcon}
          label="表头列"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!editor.can().toggleHeaderRow()}
          icon={TableIcon}
          label="表头行"
        />
      </div>

      <Separator />

      {/* Delete Table */}
      <MenuButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        icon={Trash2}
        label="删除表格"
        isDestructive
      />
    </BubbleMenu>
  );
};
