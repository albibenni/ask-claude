import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setClipboard,
  getClipboardCommandsByOS,
  getClipboard,
} from "./manage_os_clipboard.ts";
import * as childProcess from "node:child_process";
import * as fs from "node:fs/promises";

// Mock the modules
vi.mock("node:child_process");
vi.mock("node:fs/promises");

describe("setClipboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should write text to temp file and pipe to clipboard command", async () => {
    // Setup mocks
    const mockSpawn = vi.spyOn(childProcess, "spawn").mockReturnValue({
      on: vi.fn((event, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (event === "close") callback(0); // Simulate success
        return this;
      }),
      stdout: null,
      stderr: null,
      stdin: null,
    } as unknown as ReturnType<typeof childProcess.spawn>);

    const mockWriteFile = vi.spyOn(fs, "writeFile").mockResolvedValue();
    const mockUnlink = vi.spyOn(fs, "unlink").mockResolvedValue();

    // Execute
    await setClipboard("test content");

    // Assert
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("/tmp/ai-clipboard-"),
      "test content",
      "utf-8",
    );
    expect(mockSpawn).toHaveBeenCalledWith(
      "sh",
      expect.arrayContaining(["-c", expect.stringContaining("cat")]),
      expect.any(Object),
    );
    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringContaining("/tmp/ai-clipboard-"),
    );
  });

  it("should handle spawn errors gracefully", async () => {
    vi.spyOn(childProcess, "spawn").mockReturnValue({
      on: vi.fn((event, callback: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (event === "close") callback(1); // Simulate failure
        return this;
      }),
    } as unknown as ReturnType<typeof childProcess.spawn>);

    vi.spyOn(fs, "writeFile").mockResolvedValue();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await setClipboard("test");

    const mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("clipboard commands", () => {
  it("should generate correct command for each OS", () => {
    const platforms = ["darwin", "linux"];

    platforms.forEach((platform) => {
      Object.defineProperty(process, "platform", { value: platform });

      const { write } = getClipboardCommandsByOS();
      expect(write).toMatchSnapshot();
    });
  });
});
