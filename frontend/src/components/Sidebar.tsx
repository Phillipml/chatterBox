import { HiOutlinePlus } from 'react-icons/hi2';
import type { Conversation } from '../types';
import { ConversationItem } from './ConversationItem';

interface Props {
  conversations: Conversation[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  conversations,
  loading,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-secondary">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <span className="font-title text-base font-semibold text-primary">
          ChatterBox
        </span>
        <button
          onClick={onCreate}
          title="Nova conversa"
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-border hover:text-primary"
        >
          <HiOutlinePlus className="size-4" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {loading && <p className="px-3 py-2 text-xs text-secondary">Carregando…</p>}
        {!loading && conversations.length === 0 && (
          <p className="px-3 py-2 text-xs text-secondary">Nenhuma conversa ainda.</p>
        )}
        {conversations.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            active={c.id === activeId}
            onClick={() => onSelect(c.id)}
            onDelete={() => onDelete(c.id)}
          />
        ))}
      </nav>
    </aside>
  );
}
