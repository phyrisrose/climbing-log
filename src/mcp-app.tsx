import type { CallToolResult } from "@modelcontextprotocol/client";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { StrictMode, useState } from "react";
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

  // useApp creates the App, runs onAppCreated so we can register handlers
  // before any messages arrive, then connects to the host.
  const { app, error } = useApp({
    appInfo: { name: "Climbing Log", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => setSends(getSends(result));
    },
  });

  if (error) return <p>[ERROR] {error.message}</p>;
  if (!app || sends === undefined) return <p>Loading...</p>;
  if (sends === null) return <p>[ERROR] No sends in the tool result.</p>;

  return <Ledger sends={sends} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClimbingLog />
  </StrictMode>,
);
