/**
 * ToolCardShell — body mounts only while <details> is open.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolCardShell from "./ToolCardShell";
import type { ToolCallContent } from "./types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

vi.mock("./DefaultBlock", () => ({
  default: ({ title, content }: { title: string; content: string }) => (
    <div data-testid={`default-block-${title}`}>{content}</div>
  ),
}));

function makeContent(
  overrides: Partial<ToolCallContent> = {},
): ToolCallContent {
  return {
    type: "tool_call",
    id: "t1",
    name: "shell",
    params: { command: "ls" },
    result: "ok",
    status: "done",
    ...overrides,
  };
}

function clickSummary(container: HTMLElement) {
  const summary = container.querySelector("summary")!;
  fireEvent.click(summary);
}

describe("ToolCardShell lazy body mount", () => {
  it("renders summary always regardless of open state", () => {
    render(
      <ToolCardShell
        content={makeContent()}
        icon={<span>ico</span>}
        title="Run shell"
      >
        <div data-testid="heavy-body">HEAVY_OUTPUT</div>
      </ToolCardShell>,
    );

    expect(screen.getByText("Run shell")).toBeTruthy();
    expect(screen.getByText("ico")).toBeTruthy();
  });

  it("does not mount children while collapsed", () => {
    render(
      <ToolCardShell
        content={makeContent()}
        icon={<span>ico</span>}
        title="Run shell"
      >
        <div data-testid="heavy-body">HEAVY_OUTPUT</div>
      </ToolCardShell>,
    );

    expect(screen.queryByTestId("heavy-body")).toBeNull();
  });

  it("mounts children after expanding details", () => {
    const { container } = render(
      <ToolCardShell
        content={makeContent()}
        icon={<span>ico</span>}
        title="Run shell"
      >
        <div data-testid="heavy-body">HEAVY_OUTPUT</div>
      </ToolCardShell>,
    );

    clickSummary(container);

    expect(screen.getByTestId("heavy-body")).toBeTruthy();
  });

  it("unmounts children after collapsing again", () => {
    const { container } = render(
      <ToolCardShell
        content={makeContent()}
        icon={<span>ico</span>}
        title="Run shell"
      >
        <div data-testid="heavy-body">HEAVY_OUTPUT</div>
      </ToolCardShell>,
    );

    clickSummary(container);
    expect(screen.getByTestId("heavy-body")).toBeTruthy();

    clickSummary(container);
    expect(screen.queryByTestId("heavy-body")).toBeNull();
  });

  it("does not mount error DefaultBlocks until expanded", () => {
    render(
      <ToolCardShell
        content={makeContent({
          status: "error",
          params: { x: 1 },
          result: "boom",
        })}
        icon={<span>ico</span>}
        title="Failed tool"
      />,
    );

    expect(screen.queryByTestId("default-block-Input")).toBeNull();
    expect(screen.queryByTestId("default-block-Error")).toBeNull();
  });

  it("mounts error DefaultBlocks after expand", () => {
    const { container } = render(
      <ToolCardShell
        content={makeContent({
          status: "error",
          params: { x: 1 },
          result: "boom",
        })}
        icon={<span>ico</span>}
        title="Failed tool"
      />,
    );

    clickSummary(container);

    expect(screen.getByTestId("default-block-Input")).toBeTruthy();
    expect(screen.getByTestId("default-block-Error")).toBeTruthy();
  });
});
