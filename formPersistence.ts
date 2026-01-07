const DRAFT_KEY = 'flow_form_draft';

export interface FormDraft {
  timestamp: number;
  data: {
    sleep: string;
    rhr: string;
    hrv: string;
    protein: string;
    gut: number;
    sun: string;
    exercise: string;
    cognition: string;
    symptomScore: number;
    symptomName: string;
  };
}

export function saveDraft(formData: FormDraft['data']): void {
  try {
    const draft: FormDraft = {
      timestamp: Date.now(),
      data: formData
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Failed to save form draft:', error);
  }
}

export function loadDraft(): FormDraft | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    
    const draft: FormDraft = JSON.parse(stored);
    
    // Expire drafts older than 24 hours
    if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
      clearDraft();
      return null;
    }
    
    return draft;
  } catch (error) {
    console.warn('Failed to load form draft:', error);
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Failed to clear form draft:', error);
  }
}

export function hasDraft(): boolean {
  return loadDraft() !== null;
}