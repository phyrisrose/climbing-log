import { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/server";

type Send = { date: string; name: string; grade: string; location: string };

// Get element references
const sendsListEl = document.getElementById("sends-list")!;
const refreshBtn = document.getElementById("refresh-btn")!;

// Create app instance
const app = new App({ name: "Climbing Log", version: "1.0.0" });

// Render the sends as a plain list, one line per send.
function render(result: CallToolResult) {
  const sends = (result.structuredContent as { sends?: Send[] } | undefined)
    ?.sends;
  if (!sends) {
    sendsListEl.innerHTML = "<li>[ERROR]</li>";
    return;
  }
  sendsListEl.replaceChildren(
    ...sends.map((s) => {
      const li = document.createElement("li");
      li.textContent = `${s.date} — ${s.name} (${s.grade}) @ ${s.location}`;
      return li;
    }),
  );
}

// Handle tool results from the server. Set before `app.connect()` to avoid
// missing the initial tool result.
app.ontoolresult = render;

// Wire up button click
refreshBtn.addEventListener("click", async () => {
  // `app.callServerTool()` lets the UI request fresh data from the server
  render(await app.callServerTool({ name: "get-sends", arguments: {} }));
});

// Connect to host
app.connect();
