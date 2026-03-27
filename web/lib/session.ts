const KEY_API = 'openai_api_key';
const KEY_PAPER_TEXT = 'paper_text';
const KEY_PAPER_TITLE = 'paper_title';
const KEY_NOTEBOOK_JSON = 'notebook_json';

function isClient() {
  return typeof window !== 'undefined';
}

function safeSet(key: string, value: string): boolean {
  if (!isClient()) return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    // QuotaExceededError or other storage errors
    return false;
  }
}

export const session = {
  setApiKey(key: string): boolean {
    return safeSet(KEY_API, key);
  },
  getApiKey(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_API);
  },
  setPaperText(text: string): boolean {
    return safeSet(KEY_PAPER_TEXT, text);
  },
  getPaperText(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_PAPER_TEXT);
  },
  setPaperTitle(title: string): boolean {
    return safeSet(KEY_PAPER_TITLE, title);
  },
  getPaperTitle(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_PAPER_TITLE);
  },
  setNotebookJson(json: string): boolean {
    return safeSet(KEY_NOTEBOOK_JSON, json);
  },
  getNotebookJson(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_NOTEBOOK_JSON);
  },
  clear() {
    if (isClient()) {
      sessionStorage.removeItem(KEY_API);
      sessionStorage.removeItem(KEY_PAPER_TEXT);
      sessionStorage.removeItem(KEY_PAPER_TITLE);
      sessionStorage.removeItem(KEY_NOTEBOOK_JSON);
    }
  },
};
