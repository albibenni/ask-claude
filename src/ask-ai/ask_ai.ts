#!/usr/bin/env bun
// ~/.local/bin/ask-claude.ts

import { parseArgs } from "node:util";
import { getClipboard, setClipboard } from "./clipboard/manage_os_clipboard.ts";
import { formatPrompt } from "./prompt/manage_prompt.ts";
import { notify } from "./notification/manage_notifications.ts";
import { openClaude } from "./ai/manage_ai.ts";
import { getFileContent, selectFileInteractive } from "./files/manage_files.ts";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      file: { type: "string", short: "f" },
      start: { type: "string", short: "s" },
      end: { type: "string", short: "e" },
      stdin: { type: "boolean" },
      interactive: { type: "boolean", short: "i" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    const bold = "\x1b[1m";
    const cyan = "\x1b[36m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const dim = "\x1b[2m";
    const reset = "\x1b[0m";

    console.log(`${bold}Usage:${reset} ${green}ask-claude${reset} ${dim}[options]${reset}

${bold}Options:${reset}
  ${cyan}-f, --file${reset} ${dim}<path>${reset}     File to send
  ${cyan}-s, --start${reset} ${dim}<line>${reset}    Start line (with --file)
  ${cyan}-e, --end${reset} ${dim}<line>${reset}      End line (with --file)
  ${cyan}-i, --interactive${reset}     Interactive file selection
  ${cyan}    --stdin${reset}           Read from stdin
  ${cyan}-h, --help${reset}            Show help

${bold}Examples:${reset}
  ${green}ask-claude${reset}                          ${dim}# Use clipboard${reset}
  ${green}ask-claude -f main.ts${reset}               ${dim}# Send file${reset}
  ${green}ask-claude -f main.ts -s 10 -e 50${reset}   ${dim}# Send lines 10-50${reset}
  ${green}ask-claude -i${reset}                       ${dim}# Interactive selection${reset}
  ${yellow}cat file.js | ${green}ask-claude --stdin${reset}    ${dim}# Pipe input${reset}
`);
    process.exit(0);
  }

  let code: string;
  let context: string | undefined;

  // Interactive mode
  if (values.interactive) {
    const selected = await selectFileInteractive();
    if (!selected) {
      console.error("No file selected");
      process.exit(1);
    }
    const result = await getFileContent(selected);
    code = result.code;
    context = result.context;
  }
  // File mode
  else if (values.file) {
    const start = values.start ? parseInt(values.start) : undefined;
    const end = values.end ? parseInt(values.end) : undefined;
    const result = await getFileContent(values.file, start, end);
    code = result.code;
    context = result.context;
  }
  // Stdin mode
  else if (values.stdin || !process.stdin.isTTY) {
    code = await Bun.stdin.text();
    context = "From stdin";
  }
  // Clipboard mode (default)
  else {
    code = await getClipboard();
    context = "From clipboard";
  }

  if (!code.trim()) {
    console.error("No code to send");
    process.exit(1);
  }

  const prompt = formatPrompt(code, context);
  await setClipboard(prompt);

  // Launch browser and notification in background
  openClaude();
  notify("Claude", "Code copied! Paste into browser (Ctrl+V)");

  // Exit cleanly
  process.exit(0);
}

main().catch(console.error);
