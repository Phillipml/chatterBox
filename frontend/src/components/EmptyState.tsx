import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-accent">
        <HiOutlineChatBubbleLeftRight className="size-7" />
      </div>
      <h2 className="font-title text-xl font-semibold text-primary">
        Selecione uma conversa
      </h2>
      <p className="max-w-xs text-sm text-secondary">
        Escolha uma conversa na barra lateral ou crie uma nova para começar.
      </p>
    </div>
  );
}
