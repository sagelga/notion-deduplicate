export interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

export interface DuplicateGroup {
  value: string;
  pages: Page[];
}

export interface DedupeTableRow extends Record<string, unknown> {
  title: { _pageId: string; _title: string };
  created_time: string;
  action: null;
  _pageId: string;
  _isKept: boolean;
  _isExcluded: boolean;
}
