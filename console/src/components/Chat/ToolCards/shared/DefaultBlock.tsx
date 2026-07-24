/**
 * DefaultBlock — reusable Input/Output block with title + copy button.
 *
 * Renders monospace text or auto-detected markdown/JSON content inside a
 * bordered block with a copy button in the header.
 * - Markdown content → rendered via Markdown component
 * - JSON content → pretty-printed and rendered with syntax highlighting
 * - Plain text → rendered with syntax highlighting
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Markdown } from "@agentscope-ai/chat";
import { CopyOutlined, CheckOutlined, DownloadOutlined } from "@ant-design/icons";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { copyText } from "@/utils/clipboard";
import { looksLikeMarkdown, truncateMiddleByUtf8Bytes } from "./utils";
import styles from "./toolCards.module.less";

export interface DefaultBlockProps {
  title: string;
  content: string;
  copyTitle?: string;
}

/** Try to parse JSON. Returns parsed object or null. */
function tryParseJson(text: string): unknown | null {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

const highlighterStyle = {
  margin: 0,
  borderRadius: 0,
  padding: "10px 12px",
  fontSize: "12px",
  lineHeight: "1.6",
  maxHeight: "300px",
  overflowY: "auto" as const,
};

const DefaultBlock: React.FC<DefaultBlockProps> = ({
  title,
  content,
  copyTitle,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const truncation = useMemo(
    () => truncateMiddleByUtf8Bytes(content),
    [content],
  );

  const displayContent = useMemo(() => {
    if (!truncation.truncated) return content;
    const marker = t("tool.omittedBytes", { n: truncation.omittedBytes });
    return `${truncation.head}\n\n${marker}\n\n${truncation.tail}`;
  }, [content, truncation, t]);

  // Oversized output skips Markdown/JSON detection — both are costly on long text.
  const isMarkdown = useMemo(
    () => !truncation.truncated && looksLikeMarkdown(displayContent),
    [truncation.truncated, displayContent],
  );
  const parsedJson = useMemo(
    () =>
      truncation.truncated || isMarkdown ? null : tryParseJson(displayContent),
    [truncation.truncated, isMarkdown, displayContent],
  );

  const handleCopy = useCallback(() => {
    void copyText(content)
      .then(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setCopied(true);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tool-output-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }, [content]);

  const renderContent = () => {
    if (isMarkdown) {
      return (
        <div className={styles.defaultBlockContentMd}>
          <Markdown content={displayContent} />
        </div>
      );
    }
    if (parsedJson !== null) {
      return (
        <SyntaxHighlighter
          language="json"
          style={oneDark}
          customStyle={highlighterStyle}
          wrapLongLines
        >
          {JSON.stringify(parsedJson, null, 2)}
        </SyntaxHighlighter>
      );
    }
    return (
      <SyntaxHighlighter
        language="text"
        style={oneDark}
        customStyle={highlighterStyle}
        wrapLongLines
      >
        {displayContent}
      </SyntaxHighlighter>
    );
  };

  return (
    <div className={styles.defaultBlock}>
      <div className={styles.defaultBlockHeader}>
        <span className={styles.defaultBlockTitle}>{title}</span>
        <div className={styles.defaultBlockActions}>
          {truncation.truncated && (
            <button
              type="button"
              className={styles.defaultBlockCopy}
              onClick={handleDownload}
              title={t("tool.downloadRaw")}
              aria-label={t("tool.downloadRaw")}
            >
              <DownloadOutlined />
            </button>
          )}
          <button
            type="button"
            className={styles.defaultBlockCopy}
            onClick={handleCopy}
            title={copyTitle}
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default DefaultBlock;
