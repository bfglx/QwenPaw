/**
 * Tests for DefaultBlock Output copy button and truncation.
 */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@agentscope-ai/chat", () => ({
  Markdown: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }: { children: string }) => (
    <pre data-testid="syntax">{children}</pre>
  ),
}));

vi.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  oneDark: {},
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { n?: number }) => {
      if (key === "tool.omittedBytes") return `… omitted ${opts?.n ?? 0} bytes …`;
      if (key === "tool.downloadRaw") return "Download raw output";
      return key;
    },
  }),
}));

vi.mock("@ant-design/icons", () => ({
  CopyOutlined: () => <span>copy</span>,
  CheckOutlined: () => <span data-testid="check-icon">check</span>,
  DownloadOutlined: () => <span>download</span>,
}));

const { copyTextMock } = vi.hoisted(() => ({
  copyTextMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utils/clipboard", () => ({
  copyText: copyTextMock,
}));

import DefaultBlock from "./DefaultBlock";
import * as clipboard from "@/utils/clipboard";

describe("DefaultBlock copy", () => {
  beforeEach(() => {
    copyTextMock.mockReset();
    copyTextMock.mockResolvedValue(undefined);
  });

  it("copies output content through copyText helper", async () => {
    expect(clipboard.copyText).toBe(copyTextMock);

    render(<DefaultBlock title="Output" content={"Table 0\nRow 0"} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledTimes(1);
    });
    expect(copyTextMock).toHaveBeenCalledWith("Table 0\nRow 0");
  });

  it("shows copied state after copyText resolves", async () => {
    render(<DefaultBlock title="Output" content="shell output body" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });
  });
});

describe("DefaultBlock truncation", () => {
  beforeEach(() => {
    copyTextMock.mockReset();
    copyTextMock.mockResolvedValue(undefined);
  });

  it("renders short content in full without download button", () => {
    render(<DefaultBlock title="Output" content="short output" />);
    expect(screen.getByText("short output")).toBeTruthy();
    // Copy button exists, but no download button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(1);
  });

  it("middle-truncates oversize content with omission marker", () => {
    const long = "x".repeat(2500);
    render(<DefaultBlock title="Output" content={long} />);

    // Full content should not be shown
    expect(screen.queryByText(long)).toBeNull();
    // Omission marker should appear
    expect(screen.getByText(/omitted \d+ bytes/)).toBeTruthy();
    // Rendered content should be shorter than original
    const shown = screen.getByTestId("syntax").textContent || "";
    expect(shown.length).toBeLessThan(long.length);
    expect(shown.startsWith("x".repeat(50))).toBe(true);
  });

  it("shows download button when truncated", () => {
    const long = "x".repeat(2500);
    render(<DefaultBlock title="Output" content={long} />);

    expect(screen.getByLabelText("Download raw output")).toBeTruthy();
  });

  it("copy still writes the full raw content even when display is truncated", () => {
    const long = "y".repeat(2500);
    const { container } = render(
      <DefaultBlock title="Output" content={long} />,
    );

    const buttons = container.querySelectorAll("button");
    // Click the last button (the copy button)
    fireEvent.click(buttons[buttons.length - 1]);

    expect(copyTextMock).toHaveBeenCalledWith(long);
  });
});
