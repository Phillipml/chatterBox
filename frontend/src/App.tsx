import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { EmptyState } from './components/EmptyState';
import { useConversations } from './hooks/useConversations';

export default function App() {
  const { conversations, loading, create } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleCreate = async () => {
    const conv = await create();
    setActiveId(conv.id);
  };

  return (
    <div className="flex h-full bg-primary">
      <Sidebar
        conversations={conversations}
        loading={loading}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreate}
      />
      <main className="flex flex-1 overflow-hidden">
        {activeId ? (
          <ChatWindow key={activeId} conversationId={activeId} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}