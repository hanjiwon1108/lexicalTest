import {
  type EditorState,
  type NodeKey,
  type NodeMutation,
  type LexicalNode,
  $getRoot,
  $isElementNode,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { registerMutationListener } from "@lexical/utils";
import { useEffect, useCallback, useRef } from "react";
import { DocumentManager } from "@/shared/stores/DocumentManager";

// ============================================================================
// 상수 및 타입
// ============================================================================

/**
 * 외래어 추적 플러그인 설정
 */
interface ForeignWordPluginConfig {
  /** 추적할 속성 이름 (예: "originid", "refineid") */
  readonly attributeName: string;
  /** 스타일링을 위한 CSS 클래스 (예: "__origin_word__") */
  readonly className: string;
  /** 추적된 단어가 삭제되었을 때 호출되는 콜백 */
  readonly onWordDeleted: (id: string) => void;
}

type WordIdSet = Set<string>;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 노드에서 속성 값을 추출 (존재하는 경우)
 * @param node - 확인할 Lexical 노드
 * @param attributeName - 가져올 속성 이름
 * @returns 속성 값 또는 null
 */
function getNodeAttribute(
  node: LexicalNode,
  attributeName: string
): string | null {
  if (!$isElementNode(node)) return null;
  return node.getAttribute?.(attributeName) ?? null;
}

/**
 * 텍스트 노드의 부모 요소에서 모든 단어 ID 수집
 * @param attributeName - 검색할 속성
 * @returns 문서에서 발견된 단어 ID 집합
 */
function collectWordIds(attributeName: string): WordIdSet {
  const ids = new Set<string>();
  const root = $getRoot();

  for (const textNode of root.getAllTextNodes()) {
    const parent = textNode.getParent();
    if (!parent) continue;

    const id = getNodeAttribute(parent, attributeName);
    if (id) ids.add(id);
  }

  return ids;
}

/**
 * 이전에 존재했지만 현재 누락된 단어 ID 찾기
 * @param previousIds - 이전 에디터 상태의 ID
 * @param currentIds - 현재 에디터 상태의 ID
 * @returns 삭제된 단어 ID 집합
 */
function findDeletedWordIds(
  previousIds: WordIdSet,
  currentIds: WordIdSet
): WordIdSet {
  const deletedIds = new Set<string>();

  for (const id of previousIds) {
    if (!currentIds.has(id)) {
      deletedIds.add(id);
    }
  }

  return deletedIds;
}

// ============================================================================
// 뮤테이션 핸들러
// ============================================================================

/**
 * 노드 뮤테이션을 처리하고 추적된 속성을 가진 파괴된 노드를 감지
 * @param mutations - 노드 뮤테이션 맵
 * @param nodeMap - 노드 키에서 노드로의 맵
 * @param attributeName - 추적할 속성
 * @param onWordDeleted - 삭제된 단어에 대한 콜백
 */
function handleNodeMutations(
  mutations: Map<NodeKey, NodeMutation>,
  nodeMap: Map<NodeKey, LexicalNode>,
  attributeName: string,
  onWordDeleted: (id: string) => void
): void {
  for (const [nodeKey, mutation] of mutations) {
    // destroyed 노드만 처리
    if (mutation !== "destroyed") continue;

    const node = nodeMap.get(nodeKey);
    if (!node) continue;

    const wordId = getNodeAttribute(node, attributeName);
    if (wordId) {
      onWordDeleted(wordId);
    }
  }
}

// ============================================================================
// 업데이트 리스너 핸들러
// ============================================================================

/**
 * 에디터 업데이트를 처리하고 문서에서 사라진 단어를 감지
 * @param editorState - 현재 에디터 상태
 * @param prevEditorState - 이전 에디터 상태
 * @param attributeName - 추적할 속성
 * @param onWordDeleted - 삭제된 단어에 대한 콜백
 */
function handleEditorUpdate(
  editorState: EditorState,
  prevEditorState: EditorState,
  attributeName: string,
  onWordDeleted: (id: string) => void
): void {
  let previousIds: WordIdSet;
  let currentIds: WordIdSet;

  // 이전 상태에서 ID 수집
  prevEditorState.read(() => {
    previousIds = collectWordIds(attributeName);
  });

  // 현재 상태에서 ID 수집
  editorState.read(() => {
    currentIds = collectWordIds(attributeName);
  });

  // 삭제된 단어 찾기 및 처리
  const deletedIds = findDeletedWordIds(previousIds!, currentIds!);
  for (const id of deletedIds) {
    onWordDeleted(id);
  }
}

// ============================================================================
// 플러그인 팩토리
// ============================================================================

/**
 * 외래어 요소를 추적하고 관리하는 Lexical 플러그인을 생성
 *
 * 플러그인이 모니터링하는 항목:
 * - 노드 파괴 (전체 요소가 제거되었을 때)
 * - 텍스트 변경 (콘텐츠가 수정되어 단어 span이 사라졌을 때)
 *
 * @param config - 플러그인 설정
 * @returns React 컴포넌트 함수
 *
 * @example
 * ```tsx
 * const MyWordPlugin = createForeignWordPlugin({
 *   attributeName: "data-word-id",
 *   className: "tracked-word",
 *   onWordDeleted: (id) => console.log(`단어 ${id} 삭제됨`)
 * });
 *
 * <LexicalComposer>
 *   <MyWordPlugin />
 * </LexicalComposer>
 * ```
 */
function createForeignWordPlugin(config: ForeignWordPluginConfig) {
  const { attributeName, className, onWordDeleted } = config;

  return function ForeignWordPlugin(): null {
    const [editor] = useLexicalComposerContext();
    const documentManagerRef = useRef<DocumentManager>();

    // DocumentManager 한 번 초기화
    if (!documentManagerRef.current) {
      documentManagerRef.current = new DocumentManager();
    }

    // 불필요한 재등록 방지를 위해 콜백 메모이제이션
    const handleWordDeletion = useCallback((id: string) => {
      onWordDeleted(id);
    }, []);

    useEffect(() => {
      if (!editor) return;

      // 노드 파괴를 위한 뮤테이션 리스너 등록
      const unregisterMutation = registerMutationListener(
        editor,
        (mutations, nodeMap) => {
          editor.update(() => {
            handleNodeMutations(
              mutations,
              nodeMap,
              attributeName,
              handleWordDeletion
            );
          });
        }
      );

      // 텍스트 변경을 위한 업데이트 리스너 등록
      const unregisterUpdate = editor.registerUpdateListener(
        ({ editorState, prevEditorState }) => {
          handleEditorUpdate(
            editorState,
            prevEditorState,
            attributeName,
            handleWordDeletion
          );
        }
      );

      return () => {
        unregisterMutation();
        unregisterUpdate();
      };
    }, [editor, attributeName, handleWordDeletion]);

    return null;
  };
}

// ============================================================================
// 플러그인 인스턴스
// ============================================================================

/**
 * 원문(소스) 단어 추적 플러그인
 * "originid" 속성을 가진 요소를 모니터링
 *
 * @example
 * ```tsx
 * <LexicalComposer>
 *   <ForeignWordPlugin />
 * </LexicalComposer>
 * ```
 */
export const ForeignWordPlugin = createForeignWordPlugin({
  attributeName: "originid",
  className: "__origin_word__",
  onWordDeleted: (id: string) => {
    const documentManager = new DocumentManager();
    documentManager.deleteOriginWordById(id);

    if (process.env.NODE_ENV === "development") {
      console.log(`[ForeignWordPlugin] 원문 단어 삭제됨: ${id}`);
    }
  },
});

/**
 * 교정된(편집/개선된) 단어 추적 플러그인
 * "refineid" 속성을 가진 요소를 모니터링
 *
 * @example
 * ```tsx
 * <LexicalComposer>
 *   <RefinedWordPlugin />
 * </LexicalComposer>
 * ```
 */
export const RefinedWordPlugin = createForeignWordPlugin({
  attributeName: "refineid",
  className: "__refine_word__",
  onWordDeleted: (id: string) => {
    const documentManager = new DocumentManager();
    // TODO: deleteRefinedWordById가 구현되면 주석 해제
    // documentManager.deleteRefinedWordById(id);

    if (process.env.NODE_ENV === "development") {
      console.log(`[RefinedWordPlugin] 교정된 단어 삭제됨: ${id}`);
    }
  },
});

// ============================================================================
// 내보내기
// ============================================================================

export { createForeignWordPlugin };
export type { ForeignWordPluginConfig };
