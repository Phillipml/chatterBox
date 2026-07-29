import { RiRobot2Fill } from 'react-icons/ri';
import type { Message } from '../types';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mb-1 mr-2 flex items-end">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <RiRobot2Fill className="size-3.5" />
          </div>
        </div>
      )}
      <div
        className={[
          'max-w-[72%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'rounded-br-sm bg-accent text-primary'
            : 'rounded-bl-sm border border-border bg-secondary text-primary',
        ].join(' ')}
      >
        {message.content}
      </div>
    </div>
  );
}
