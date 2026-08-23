import { create } from "zustand";

type ChatUIState = {
  open: boolean;
  selectedId: string | null;
  /** Open the panel; pass a conversation id to also select it. */
  openPanel: (id?: string | null) => void;
  selectConversation: (id: string | null) => void;
  closePanel: () => void;
};

export const useChatUI = create<ChatUIState>((set) => ({
  open: false,
  selectedId: null,
  openPanel: (id) => set((s) => ({ open: true, selectedId: id !== undefined ? id : s.selectedId })),
  selectConversation: (id) => set({ selectedId: id }),
  closePanel: () => set({ open: false }),
}));
