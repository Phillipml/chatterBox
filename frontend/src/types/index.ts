export interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'ai';
    content: string;
    created_at: string;
  }