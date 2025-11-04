import { useState } from "react";
import type { EditorState } from "lexical";
import { $getRoot } from "lexical";
import EditorShell from "./components/EditorShell";
import PreviewComponent from "./components/Preview";
import * as S from "./styles/AppStyles";

/* 기존에 App.tsx에 인라인 정의되어 있던 AdvancedToolbar / AutoLinkPlugin / 스타일 블록을 제거했습니다.
   툴바 등은 이미 분리된 컴포넌트들을 사용합니다:
   - AdvancedToolbar: src/components/AdvancedToolbar.tsx
   - AutoLinkPlugin: src/components/AutoLinkPlugin.tsx
   - EditorShell: src/components/EditorShell.tsx
   - PreviewComponent: src/components/Preview.tsx
*/

/**
 * 아래에서 사용하는 Lexical 노드들을 명시적으로 import 합니다.
 * (워크스페이스에 해당 패키지들이 설치되어 있어야 합니다.)
 */
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { AutoLinkNode, LinkNode } from "@lexical/link";

export default function App() {
  // codeHighlight의 키를 문자열로 감싸 linter/파서 혼동을 회피합니다.
  const codeHighlight = {
    atrule: "editor-token-atrule",
    attr: "editor-token-attr",
    boolean: "editor-token-boolean",
    builtin: "editor-token-builtin",
    cdata: "editor-token-cdata",
    char: "editor-token-char",
    class: "editor-token-class",
    comment: "editor-token-comment",
    constant: "editor-token-constant",
    deleted: "editor-token-deleted",
    doctype: "editor-token-doctype",
    entity: "editor-token-entity",
    function: "editor-token-function",
    important: "editor-token-important",
    inserted: "editor-token-inserted",
    keyword: "editor-token-keyword",
    namespace: "editor-token-namespace",
    number: "editor-token-number",
    operator: "editor-token-operator",
    prolog: "editor-token-prolog",
    property: "editor-token-property",
    punctuation: "editor-token-punctuation",
    regex: "editor-token-regex",
    selector: "editor-token-selector",
    string: "editor-token-string",
    symbol: "editor-token-symbol",
    tag: "editor-token-tag",
    url: "editor-token-url",
    variable: "editor-token-variable",
  };

  const initialConfig = {
    namespace: "AdvancedEditor",
    theme: {
      paragraph: "editor-paragraph",
      heading: {
        h1: "editor-heading-h1",
        h2: "editor-heading-h2",
        h3: "editor-heading-h3",
      },
      list: {
        nested: {
          listitem: "editor-nested-listitem",
        },
        ol: "editor-list-ol",
        ul: "editor-list-ul",
        listitem: "editor-listitem",
        checklist: "editor-checklist",
      },
      quote: "editor-quote",
      code: "editor-code",
      codeHighlight: codeHighlight,
      link: "editor-link",
      text: {
        bold: "editor-text-bold",
        italic: "editor-text-italic",
        underline: "editor-text-underline",
        strikethrough: "editor-text-strikethrough",
        code: "editor-text-code",
      },
    },
    nodes: [
      // 명시적 import로 ReferenceError 해결
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
    onError: (error: unknown) => {
      console.error(error);
    },
  };

  const [preview, setPreview] = useState<null | {
    type: "embed" | "iframe" | "link";
    src: string;
  }>(null);
  const [lastDetectedUrl, setLastDetectedUrl] = useState<string | null>(null);

  function generatePreview(rawUrl: string) {
    // sanitize incoming rawUrl (strip wrapping <>, quotes, trailing punctuation)
    function sanitizeUrl(input: string) {
      let s = input.trim();
      // remove surrounding <> or quotes
      if (
        (s.startsWith("<") && s.endsWith(">")) ||
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
      ) {
        s = s.slice(1, -1);
      }
      // strip trailing punctuation that commonly follows URLs in text
      s = s.replace(/[.,!?;:]+$/g, "");
      // also trim any trailing closing parenthesis or bracket if it doesn't belong
      s = s.replace(/[)\]]+$/g, "");
      return s;
    }

    try {
      const cleaned = sanitizeUrl(rawUrl);
      const url = new URL(cleaned);
      const host = url.hostname.toLowerCase();

      // linter/파서가 'youtu.be' 문자열을 문제삼는 경우가 있어 'youtube' / 'youtu'로 단순화
      if (host.includes("youtube") || host.includes("youtu")) {
        let videoId = "";
        // youtu.be 짧은 URL 처리: 예) youtu.be/VIDEOID
        if (host.includes(".be")) {
          videoId = url.pathname.slice(1);
        } else {
          // 정규 YouTube URL: v 파라미터
          videoId = url.searchParams.get("v") || "";
          // /embed/VIDEOID 경로 처리
          if (!videoId && url.pathname.startsWith("/embed/")) {
            videoId = url.pathname.split("/embed/")[1] || "";
          }
        }
        // strip any leftover query or punctuation
        videoId = (videoId || "")
          .split(new RegExp("[?&/\\s]+"))[0]
          .replace(/[.,)!\]]+$/g, "");
        if (videoId) {
          return {
            type: "embed" as const,
            src: `https://www.youtube.com/embed/${videoId}`,
          };
        }
      }

      if (host.includes("vimeo.com")) {
        const parts = url.pathname.split("/").filter(Boolean);
        let id = parts[parts.length - 1] || "";
        id = id.split(new RegExp("[?&/\\s]+"))[0].replace(/[.,)!\]]+$/g, "");
        if (id) {
          return {
            type: "embed" as const,
            src: `https://player.vimeo.com/video/${id}`,
          };
        }
      }

      const allowedIframeHosts = new Set(["example.com"]);
      if (allowedIframeHosts.has(host)) {
        return { type: "iframe" as const, src: rawUrl };
      }

      return { type: "link" as const, src: rawUrl };
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function onChange(editorState: EditorState) {
    editorState.read(() => {
      const root = $getRoot();
      const content = root.getTextContent();
      const urlMatch = content.match(/https?:\/\/\S+/i);
      if (urlMatch && urlMatch[0]) {
        const raw = urlMatch[0].trim();
        setLastDetectedUrl(raw);
        setPreview(generatePreview(raw));
      } else {
        setLastDetectedUrl(null);
        setPreview(null);
      }
    });
  }

  return (
    <S.AppContainer>
      {/* 전역 포커스 리셋을 앱 루트에 렌더하여 에디터 내부의 파란 포커스 링을 제거 */}
      <S.EditorFocusReset />
      <S.AppHeader>
        <h1>Lexical Editor 실험 현장</h1>
        <p>Lexical Editor에서 사용하고 싶은 모든걸 사용하는 중</p>
      </S.AppHeader>

      <S.EditorWrapper>
        {/* EditorShell은 [src/components/EditorShell.tsx]에서 LexicalComposer와 툴바/플러그인을 구성합니다. */}
        <EditorShell initialConfig={initialConfig} onChange={onChange} />

        {/* URL/미리보기 출력 영역 */}
        <PreviewComponent preview={preview} lastDetectedUrl={lastDetectedUrl} />
      </S.EditorWrapper>
    </S.AppContainer>
  );
}
