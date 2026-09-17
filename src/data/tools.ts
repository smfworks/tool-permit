export interface SuggestedTool {
  id: string;
  label: string;
  hint: string;
}

/** Common agent tools offered as one-tap chips. */
export const SUGGESTED_TOOLS: SuggestedTool[] = [
  { id: "shell", label: "shell", hint: "terminal / bash" },
  { id: "browser", label: "browser", hint: "open pages" },
  { id: "read", label: "read", hint: "open files" },
  { id: "write", label: "write", hint: "create / save" },
  { id: "edit", label: "edit", hint: "patch files" },
  { id: "git", label: "git", hint: "commit / branch" },
  { id: "grep", label: "grep", hint: "search code" },
  { id: "glob", label: "glob", hint: "find paths" },
  { id: "search", label: "search", hint: "web / docs" },
  { id: "email", label: "email", hint: "send / inbox" },
  { id: "calendar", label: "calendar", hint: "events" },
  { id: "deploy", label: "deploy", hint: "ship / host" },
  { id: "payments", label: "payments", hint: "money movement" },
  { id: "slack", label: "slack", hint: "chat post" },
  { id: "docker", label: "docker", hint: "containers" },
  { id: "mcp", label: "mcp", hint: "connected tools" },
];

export const SUGGESTED_IDS: readonly string[] = SUGGESTED_TOOLS.map((tool) => tool.id);
