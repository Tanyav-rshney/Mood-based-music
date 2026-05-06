import { create } from 'zustand';

const useUIStore = create((set) => ({
  isVoiceSearchOpen: false,
  voiceQuery: '',
  setVoiceSearchOpen: (isOpen) => set({ isVoiceSearchOpen: isOpen }),
  setVoiceQuery: (query) => set({ voiceQuery: query }),
}));

export default useUIStore;
