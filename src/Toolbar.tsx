import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND } from "lexical";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_TABLE_COMMAND } from "@lexical/table";

export function Toolbar() {
  const [editor] = useLexicalComposerContext();

  return (
    <div className="toolbar">
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        굵게
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        기울임
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
      >
        밑줄
      </button>
      <button
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
      >
        불릿 리스트
      </button>
      <button
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
      >
        번호 리스트
      </button>
      <button
        onClick={() =>
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://example.com")
        }
      >
        링크
      </button>
      <button
        onClick={() =>
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            rows: "2",
            columns: "2",
          })
        }
      >
        테이블
      </button>
    </div>
  );
}
