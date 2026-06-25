import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type SectionId = 'infrastructure' | 'sport' | 'sustainability';

interface SectionState {
  completed: boolean;
  resultModelPath: string | null;
}

export type VisitedState = Record<SectionId, SectionState>;

const INITIAL: VisitedState = {
  infrastructure: { completed: false, resultModelPath: null },
  sport:          { completed: false, resultModelPath: null },
  sustainability: { completed: false, resultModelPath: null },
};

function loadFromSession(): VisitedState {
  if (!browser) return INITIAL;
  try {
    const raw = sessionStorage.getItem('visitedSections');
    if (raw) return JSON.parse(raw) as VisitedState;
  } catch {}
  return { ...INITIAL };
}

function createStore() {
  const { subscribe, update, set } = writable<VisitedState>(loadFromSession());
  return {
    subscribe,
    markCompleted(sectionId: SectionId, resultModelPath: string) {
      update((state) => {
        const next = { ...state, [sectionId]: { completed: true, resultModelPath } };
        if (browser) {
          try { sessionStorage.setItem('visitedSections', JSON.stringify(next)); } catch {}
        }
        return next;
      });
    },
    reset() {
      if (browser) {
        try { sessionStorage.removeItem('visitedSections'); } catch {}
      }
      set({ ...INITIAL });
    },
  };
}

export const visitedSections = createStore();

export const allSectionsCompleted = derived(
  visitedSections,
  ($v) => ($v.infrastructure.completed && $v.sport.completed && $v.sustainability.completed)
);
