import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalEditor, EditorState } from "lexical";
import Timer from "tiny-timer";

import HoverTracker from "@/shared/components/overlay/HoverTracker";
import Sidebar from "@/shared/components/write/sideBar/SideBar";
import * as S from "./WriteHeader/style";
import { DocumentManager } from "@/shared/stores/DocumentManager";
import {
  DataUniqueAttributePlugin,
  ForeignWordPlugin,
  RefinedWordPlugin,
} from "./Plugin/LexicalPlugins";

import "./style.css";

// ============================================================================
// 상수 및 타입
// ============================================================================

const LICENSE_KEY = "GPL" as const;
const AUTO_SAVE_DELAY_MS = 2000 as const;
const EDITOR_NAMESPACE = "LexicalEditor" as const;
const EDITOR_CONTENT_ID = "lexical-editor" as const;

interface FileData {
  title: string;
  content: string;
  hashed_id: string;
  updated_at: string;
}

interface EditorConfig {
  namespace: string;
  editable: boolean;
  theme: Record<string, string>;
  onError: (error: Error) => void;
  editorState?: string;
}

// ============================================================================
// 목 데이터
// ============================================================================

const MOCK_FILE_DATA: FileData = {
  title: "샘플 제목",
  content: `
    <p>샘플 콘텐츠 — 외래어 하이라이트 예시입니다.</p>
    <p>
      원문: 
      <span class="__origin_word__" originid="orig-1">bonjour</span>,
      <span class="__origin_word__" originid="orig-2">hola</span>,
      <span class="__origin_word__" originid="orig-3">ciao</span>
    </p>
    <p>
      교정 예시: 
      <span class="__refine_word__" refineid="ref-1">hello</span>
    </p>
  `,
  hashed_id: "sample-hashed-id",
  updated_at: new Date().toISOString(),
};

// ============================================================================
// API 서비스
// ============================================================================

class FileService {
  private static readonly BASE_URL = import.meta.env.VITE_API_URL;

  /**
   * 해시 ID로 파일 데이터 가져오기
   * @param hashedId - 파일의 고유 식별자
   * @returns 파일 데이터 또는 실패 시 null
   */
  static async fetchFile(hashedId: string): Promise<FileData | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/files/${hashedId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[FileService] 파일 가져오기 실패:", error);
      return null;
    }
  }
}

// ============================================================================
// 커스텀 훅
// ============================================================================

/**
 * 파일 데이터 로딩 관리 훅
 * @param hashedId - URL 파라미터의 파일 식별자
 * @returns 파일 데이터와 로딩 상태
 */
function useFileData(hashedId: string | undefined) {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadFile = async () => {
      if (!hashedId) {
        setError(new Error("파일 ID가 제공되지 않았습니다"));
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 개발 환경에서는 목 데이터 사용
        if (import.meta.env.VITE_MOCK_DATA) {
          setFileData(MOCK_FILE_DATA);
          setIsLoading(false);
          return;
        }

        const data = await FileService.fetchFile(hashedId);

        if (isMounted) {
          if (data) {
            setFileData(data);
          } else {
            setError(new Error("파일 로드 실패"));
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("알 수 없는 오류"));
          setIsLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [hashedId]);

  return { fileData, isLoading, error };
}

/**
 * 자동 저장 기능 관리 훅
 * @param documentManager - 문서 관리자 인스턴스
 * @returns 저장 타이머를 트리거하는 함수
 */
function useAutoSave(documentManager: DocumentManager) {
  const timerRef = useRef<Timer>(new Timer());

  const handleSave = useCallback(() => {
    const editorElement = document.getElementById(EDITOR_CONTENT_ID);
    const content = editorElement?.innerHTML ?? "";

    if (content) {
      documentManager.handleDocumentModifications(content);
    }
  }, [documentManager]);

  useEffect(() => {
    const timer = timerRef.current;
    timer.on("done", handleSave);

    return () => {
      timer.stop();
      timer.off("done", handleSave);
    };
  }, [handleSave]);

  const startSaveTimer = useCallback(() => {
    const timer = timerRef.current;
    timer.stop();
    timer.start(AUTO_SAVE_DELAY_MS);
  }, []);

  return startSaveTimer;
}

// ============================================================================
// 에디터 플러그인
// ============================================================================

/**
 * 실시간 단어 수를 표시하는 플러그인
 */
function WordCountPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const unregister = editor.registerTextContentListener((text) => {
      const words = text.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
    });

    return unregister;
  }, [editor]);

  return (
    <div className="editor-wordcount" aria-live="polite">
      단어 수: {wordCount}
    </div>
  );
}

/**
 * 콘텐츠 변경 시 자동 저장을 트리거하는 플러그인
 */
function AutoSavePlugin({ onSave }: { onSave: () => void }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves }) => {
        // 콘텐츠가 실제로 변경된 경우에만 저장 트리거
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          onSave();
        }
      }
    );

    return unregister;
  }, [editor, onSave]);

  return null;
}

// ============================================================================
// 툴바 컴포넌트
// ============================================================================

type FormatCommand = "bold" | "italic" | "underline";

const TOOLBAR_BUTTONS: Array<{
  command: FormatCommand;
  label: string;
  ariaLabel: string;
}> = [
  { command: "bold", label: "B", ariaLabel: "굵게" },
  { command: "italic", label: "I", ariaLabel: "기울임" },
  { command: "underline", label: "U", ariaLabel: "밑줄" },
];

/**
 * 리치 텍스트 포매팅 툴바
 */
function Toolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const handleFormat = useCallback(
    (command: FormatCommand) => {
      editor.dispatchCommand(command as any, undefined);
    },
    [editor]
  );

  return (
    <div className="lexical-toolbar" role="toolbar" aria-label="텍스트 서식">
      {TOOLBAR_BUTTONS.map(({ command, label, ariaLabel }) => (
        <button
          key={command}
          onClick={() => handleFormat(command)}
          aria-label={ariaLabel}
          className="toolbar-button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// 에디터 설정
// ============================================================================

/**
 * Lexical 에디터 설정 생성
 * @param content - 초기 HTML 콘텐츠
 * @returns 에디터 설정 객체
 */
function createEditorConfig(content: string): EditorConfig {
  return {
    namespace: EDITOR_NAMESPACE,
    editable: true,
    theme: {
      paragraph: "editor-paragraph",
    },
    onError(error: Error) {
      console.error("[Lexical] 에디터 오류:", error);
      // TODO: 에러 추적 서비스로 전송 (예: Sentry)
    },
    editorState: content,
  };
}

// ============================================================================
// 로딩 및 에러 상태
// ============================================================================

function LoadingState(): JSX.Element {
  return (
    <div className="editor-loading" role="status" aria-live="polite">
      에디터 로딩 중...
    </div>
  );
}

function ErrorState({ error }: { error: Error }): JSX.Element {
  return (
    <div className="editor-error" role="alert">
      <h2>에디터 로드 실패</h2>
      <p>{error.message}</p>
    </div>
  );
}

// ============================================================================
// 메인 에디터 컴포넌트
// ============================================================================

/**
 * 자동 저장 및 리치 텍스트 기능을 갖춘 Lexical 에디터 컴포넌트
 *
 * 기능:
 * - 실시간 단어 수 표시
 * - 변경 후 2초마다 자동 저장
 * - 리치 텍스트 포매팅 (굵게, 기울임, 밑줄)
 * - 외래어 추적
 * - 실행 취소/다시 실행 기록
 *
 * @example
 * ```tsx
 * <Route path="/write/:hashed_id" element={<LexicalEditorComponent />} />
 * ```
 */
export default function LexicalEditorComponent(): JSX.Element {
  const { hashed_id } = useParams<{ hashed_id: string }>();
  const { fileData, isLoading, error } = useFileData(hashed_id);

  const documentManagerRef = useRef<DocumentManager>();
  if (!documentManagerRef.current) {
    documentManagerRef.current = new DocumentManager();
  }

  const startSaveTimer = useAutoSave(documentManagerRef.current);

  const editorConfig = useMemo(
    () => (fileData ? createEditorConfig(fileData.content) : null),
    [fileData]
  );

  // 로딩 상태 처리
  if (isLoading) {
    return <LoadingState />;
  }

  // 에러 상태 처리
  if (error || !fileData) {
    return <ErrorState error={error ?? new Error("파일을 찾을 수 없습니다")} />;
  }

  // 잘못된 설정 처리
  if (!editorConfig) {
    return <ErrorState error={new Error("잘못된 에디터 설정")} />;
  }

  return (
    <div className="main-container">
      <div className="editor-container editor-container_document-editor">
        {/* 헤더 */}
        <S.WriteHeader>
          <h1 className="title">{fileData.title}</h1>
        </S.WriteHeader>

        {/* 에디터 섹션 */}
        <S.WriteSection>
          <div className="editor-container-section">
            <HoverTracker>
              <LexicalComposer initialConfig={editorConfig}>
                <Toolbar />

                <div className="editor-wrapper">
                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable
                        id={EDITOR_CONTENT_ID}
                        className="editor-content"
                        aria-label="문서 에디터"
                      />
                    }
                    placeholder={
                      <div className="editor-placeholder" aria-hidden="true">
                        여기에 내용을 입력하거나 붙여넣으세요...
                      </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />

                  {/* 핵심 플러그인 */}
                  <HistoryPlugin />
                  <AutoSavePlugin onSave={startSaveTimer} />
                  <WordCountPlugin />

                  {/* 커스텀 플러그인 */}
                  <DataUniqueAttributePlugin />
                  <ForeignWordPlugin />
                  <RefinedWordPlugin />
                </div>
              </LexicalComposer>
            </HoverTracker>
          </div>

          <Sidebar />
        </S.WriteSection>
      </div>
    </div>
  );
}
