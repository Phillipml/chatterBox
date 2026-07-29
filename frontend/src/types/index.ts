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

export type WsClientMessage = {
  type: 'user_message';
  content: string;
};

export type WsServerMessage =
  | { type: 'user_saved'; message: Message }
  | { type: 'ai_start' }
  | { type: 'ai_token'; content: string }
  | { type: 'ai_done'; message: Message }
  | { type: 'error'; detail: string };
