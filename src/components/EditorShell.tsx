import React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import AdvancedToolbar from "./AdvancedToolbar";
import AutoLinkPlugin from "./AutoLinkPlugin";
import type { InitialConfigType, EditorState } from "lexical";

export default function EditorShell({
  initialConfig,
  onChange,
}: {
  initialConfig: InitialConfigType;
  onChange: (editorState: EditorState) => void;
}): JSX.Element {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-wrapper">
        <AdvancedToolbar />
        <div className="editor-container">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="editor-input" id="lexical-editor" />
            }
            placeholder={
              <div className="editor-placeholder">내용을 입력하세요...</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <AutoLinkPlugin />
          <TablePlugin />
          <HorizontalRulePlugin />
          <TabIndentationPlugin />
        </div>
      </div>
    </LexicalComposer>
  );
}
