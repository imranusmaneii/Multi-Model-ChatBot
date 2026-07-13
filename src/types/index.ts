export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  timestamp: Date;
}

export interface SourceChunk {
  content: string;
  page: number;
  score: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isIngested: boolean;
  error: string | null;
}
