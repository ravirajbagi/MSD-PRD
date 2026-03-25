const KEY_API = 'openai_api_key';
const KEY_PAPER_TEXT = 'paper_text';
const KEY_PAPER_TITLE = 'paper_title';
const KEY_NOTEBOOK_JSON = 'notebook_json';

function isClient() {
  return typeof window !== 'undefined';
}

export const session = {
  setApiKey(key: string) {
    if (isClient()) sessionStorage.setItem(KEY_API, key);
  },
  getApiKey(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_API);
  },
  setPaperText(text: string) {
    if (isClient()) sessionStorage.setItem(KEY_PAPER_TEXT, text);
  },
  getPaperText(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_PAPER_TEXT);
  },
  setPaperTitle(title: string) {
    if (isClient()) sessionStorage.setItem(KEY_PAPER_TITLE, title);
  },
  getPaperTitle(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(KEY_PAPER_TITLE);
  },
  setNotebookJson(json: string) {
    if (isClient()) sessionStorage.setItem(KEY_NOTEBOOK_JSON, json);
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
