import { HiOutlineTrash } from 'react-icons/hi2';
import type { Conversation } from '../types';

interface Props {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, active, onClick, onDelete }: Props) {
  const label = conversation.title ?? 'Nova conversa';

  return (
    <div
      className={[
        'group flex w-full items-center gap-1 rounded-lg transition-colors duration-150',
        active ? 'bg-accent' : 'hover:bg-secondary',
      ].join(' ')}
    >
      <button
        onClick={onClick}
        className={[
          'min-w-0 flex-1 cursor-pointer truncate rounded-lg p-3 text-left text-sm font-title',
          active ? 'font-medium text-primary' : 'text-secondary group-hover:text-primary',
        ].join(' ')}
      >
        {label}
      </button>
      <button
        type="button"
        title="Apagar conversa"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="mr-2 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-red-600 text-primary opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
      >
        <HiOutlineTrash className="size-4" />
      </button>
    </div>
  );
}
