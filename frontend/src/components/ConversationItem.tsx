import type { Conversation } from '../types';

interface Props {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, active, onClick }: Props) {
  const label = conversation.title ?? 'Nova conversa';

  return (
    <button
      onClick={onClick}
      className={[
        'w-full cursor-pointer truncate rounded-lg p-3 text-left text-sm font-title transition-colors duration-150 ',
        active
          ? 'bg-accent font-medium text-primary'
          : 'text-secondary hover:bg-secondary hover:text-primary',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
