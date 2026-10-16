export type GhIssue = {
  number: number;
  title: string;
  body: string | null;
  pull_request?: unknown;
  assignee?: { login: string } | null;
  labels?: { name: string }[];
};
