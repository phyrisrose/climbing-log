import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { Temporal } from "@js-temporal/polyfill";
import { McpServer } from "@modelcontextprotocol/server";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { validateSend } from "./src/sendInput.ts";
import { addSend, DuplicateSendError, readSends } from "./src/sendsStore.ts";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(ROOT_DIR, "dist");
// The log file. Set SENDS_PATH to point at a copy, e.g. for manual testing.
const SENDS_PATH = path.resolve(process.env.SENDS_PATH ?? path.join(ROOT_DIR, "sends.json"));

/**
 * Creates a new MCP server instance with tools and resources registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Climbing Log",
    version: "1.0.0",
  });

  // Two-part registration: tool + resource, tied together by the resource URI.
  const resourceUri = "ui://get-sends/mcp-app.html";

  // Register a tool with UI metadata. When the host calls this tool, it reads
  // `_meta.ui.resourceUri` to know which resource to fetch and render as an
  // interactive UI.
  registerAppTool(
    server,
    "get-sends",
    {
      title: "Get Sends",
      description:
        "Returns the climbing log: every logged send with date, name, grade, and location.",
      inputSchema: z.object({}),
      _meta: { ui: { resourceUri } }, // Links this tool to its UI resource
    },
    async () => {
      const sends = await readSends(SENDS_PATH);
      return {
        // Text for the model; structuredContent for the View.
        content: [{ type: "text", text: JSON.stringify(sends) }],
        structuredContent: { sends },
      };
    },
  );

  // Adds a climb to the log. Uses the same View as get-sends, so the host
  // shows the updated ledger with the new climb in it.
  registerAppTool(
    server,
    "log-send",
    {
      title: "Log a Send",
      description:
        "Adds a climb the user sent (completed) to their climbing log, then shows the updated log. " +
        "Only call this when the user says they sent a climb. If the climb's name, grade, or " +
        "location is missing or unclear, ask the user instead of guessing.",
      inputSchema: z.object({
        name: z.string().describe("The climb's name, e.g. \"Pea Brain\"."),
        grade: z
          .string()
          .describe("YDS for routes (e.g. 5.10a) or V-scale for boulders (e.g. V5)."),
        location: z
          .string()
          .describe("The crag or area, e.g. \"Eldorado Canyon, CO\"."),
        date: z
          .string()
          .optional()
          .describe("When it was sent, as YYYY-MM-DD. Leave out for today."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      _meta: { ui: { resourceUri } },
    },
    async (input) => {
      // Today on this machine's calendar, so an evening send counts as today.
      const today = Temporal.Now.plainDateISO().toString();
      const result = validateSend(input, today);
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Not logged. ${result.errors.join(" ")}` }],
        };
      }

      try {
        const sends = await addSend(SENDS_PATH, result.send);
        const { name, grade, location, date } = result.send;
        return {
          content: [
            {
              type: "text",
              text: `Logged ${name} (${grade}) at ${location} on ${date}. ${sends.length} sends in the log.`,
            },
          ],
          structuredContent: { sends },
        };
      } catch (error) {
        if (error instanceof DuplicateSendError) {
          return { isError: true, content: [{ type: "text", text: `Not logged. ${error.message}` }] };
        }
        throw error;
      }
    },
  );

  // Register the resource, which returns the bundled HTML/JavaScript for the UI.
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );

      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}
