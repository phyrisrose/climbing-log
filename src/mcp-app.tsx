import type { CallToolResult } from "@modelcontextprotocol/client";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Send } from "./grades.ts";
import { Ledger } from "./Ledger.tsx";
import "./mcp-app.css";

// The tool's structuredContent is { sends: Send[] }. null means it's missing.
function getSends(result: CallToolResult): Send[] | null {
  return (result.structuredContent as { sends?: Send[] } | undefined)?.sends ?? null;
}

function ClimbingLog() {
  // undefined = no tool result yet, null = the result had no sends.
  const [sends, setSends] = useState<Send[] | null>();
  const [hostContext, setHostContext] = useState<McpUiHostContext>();

  // useApp creates the App, runs onAppCreated so we can register handlers
  // before any messages arrive, then connects to the host.
  const { app, error } = useApp({
    appInfo: { name: "Climbing Log", version: "1.0.0" },
    // Tells the host we can render both inline and fullscreen.
    capabilities: { availableDisplayModes: ["inline", "fullscreen"] },
    onAppCreated: (app) => {
      app.ontoolresult = (result) => setSends(getSends(result));
    },
  });

  // Applies the host's CSS variables, fonts and light/dark color-scheme to
  // the page, and keeps them in sync when the host changes theme.
  useHostStyles(app, app?.getHostContext());

  // Keep a copy of the host context in state so a display-mode change
  // re-renders. The App merges each change into its own context before
  // notifying listeners, so re-reading it gives the full, current context.
  useEffect(() => {
    if (!app) return;
    setHostContext(app.getHostContext());
    const onChange = () => setHostContext({ ...app.getHostContext() });
    app.addEventListener("hostcontextchanged", onChange);
    return () => app.removeEventListener("hostcontextchanged", onChange);
  }, [app]);

  if (error) return <p>[ERROR] {error.message}</p>;
  if (!app || sends === undefined) return <p>Loading...</p>;
  if (sends === null) return <p>[ERROR] No sends in the tool result.</p>;

  const expanded = hostContext?.displayMode === "fullscreen";
  const canExpand = hostContext?.availableDisplayModes?.includes("fullscreen") ?? false;

  const toggleExpand = async () => {
    try {
      // The host answers with the mode it actually set, and also sends a
      // host context change, which updates `expanded` above.
      await app.requestDisplayMode({ mode: expanded ? "inline" : "fullscreen" });
    } catch (e) {
      console.error("Display mode change failed:", e);
    }
  };

  return (
    <Ledger
      sends={sends}
      expanded={expanded}
      canExpand={canExpand}
      onToggleExpand={toggleExpand}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClimbingLog />
  </StrictMode>,
);
