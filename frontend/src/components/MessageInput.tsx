import { useRef, useState } from 'react';
import { IoSend } from 'react-icons/io5';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border bg-primary p-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Mensagem…"
        disabled={disabled}
        rows={1}
        className="max-h-36 flex-1 resize-none overflow-hidden rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-primary placeholder:text-secondary transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
      />
      <button
        onClick={submit}
        disabled={!value.trim() || disabled}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <IoSend className="size-4" />
      </button>
    </div>
  );
}
