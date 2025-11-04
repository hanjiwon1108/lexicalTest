import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getRoot,
} from "lexical";
import { $createTextNode } from "lexical";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import type { TextFormatType, ElementFormatType } from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
} from "@lexical/list";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { LinkNode } from "@lexical/link";

// 아이콘 대체용 임시 컴포넌트
const Icon = ({ label }: { label: string }) => (
  <span style={{ fontWeight: "bold", fontSize: 16 }}>{label}</span>
);

export default function AdvancedToolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
  };

  // headingSize 타입을 any에서 구체적인 유니언 타입으로 변경하여 컴파일 오류 제거
  type HeadingSize = "h1" | "h2" | "h3";

  const insertHeading = (headingSize: HeadingSize) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const heading = $createHeadingNode(headingSize);
        selection.insertNodes([heading]);
      }
    });
  };

  const insertQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const quote = $createQuoteNode();
        selection.insertNodes([quote]);
      }
    });
  };

  const insertCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const code = $createCodeNode();
        selection.insertNodes([code]);
      }
    });
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: "3", columns: "3" });
  };

  const insertHorizontalRule = () => {
    // HorizontalRulePlugin이 처리
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (!url) return;

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      } else {
        const root = $getRoot();
        const link = new LinkNode(url);
        const text = $createTextNode(url);
        link.append(text);
        root.append(link);
      }
    });
  };

  const exportToJSON = () => {
    editor.update(() => {
      const editorState = editor.getEditorState();
      const json = JSON.stringify(editorState.toJSON());
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "editor-content.json";
      a.click();
    });
  };

  const exportToHTML = () => {
    editor.update(() => {
      const root = $getRoot();
      const html = root.getTextContent();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "editor-content.html";
      a.click();
    });
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          title="Undo"
        >
          <Icon label="⎌" />
        </button>
        <button
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          title="Redo"
        >
          <Icon label="↻" />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={() => formatText("bold")} title="Bold">
          <Icon label="B" />
        </button>
        <button onClick={() => formatText("italic")} title="Italic">
          <Icon label="I" />
        </button>
        <button onClick={() => formatText("underline")} title="Underline">
          <Icon label="U" />
        </button>
        <button
          onClick={() => formatText("strikethrough")}
          title="Strikethrough"
        >
          <Icon label="S" />
        </button>
        <button onClick={() => formatText("code")} title="Inline Code">
          <Icon label="{" />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={() => insertHeading("h1")} title="Heading 1">
          <Icon label="H1" />
        </button>
        <button onClick={() => insertHeading("h2")} title="Heading 2">
          <Icon label="H2" />
        </button>
        <button onClick={() => insertHeading("h3")} title="Heading 3">
          <Icon label="H3" />
        </button>
        <button onClick={insertQuote} title="Quote">
          <Icon label="❝" />
        </button>
        <button onClick={insertCodeBlock} title="Code Block">
          <Icon label="{" />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={() => formatElement("left")} title="Align Left">
          <Icon label="⯇" />
        </button>
        <button onClick={() => formatElement("center")} title="Align Center">
          <Icon label="≡" />
        </button>
        <button onClick={() => formatElement("right")} title="Align Right">
          <Icon label="⯈" />
        </button>
        <button onClick={() => formatElement("justify")} title="Justify">
          <Icon label="☰" />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button
          onClick={() =>
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
          }
          title="Bullet List"
        >
          <Icon label="•" />
        </button>
        <button
          onClick={() =>
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
          }
          title="Numbered List"
        >
          <Icon label="1." />
        </button>
        <button
          onClick={() =>
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
          }
          title="Check List"
        >
          <Icon label="☑" />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={insertTable} title="Insert Table">
          <Icon label="T" />
        </button>
        <button onClick={insertHorizontalRule} title="Horizontal Rule">
          <Icon label="─" />
        </button>
        <button onClick={insertLink} title="Insert Link">
          <Icon label="🔗" />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <button onClick={exportToJSON} title="Export JSON">
          <Icon label="↓" />
        </button>
        <button onClick={exportToHTML} title="Export HTML">
          <Icon label="💾" />
        </button>
      </div>
    </div>
  );
}
