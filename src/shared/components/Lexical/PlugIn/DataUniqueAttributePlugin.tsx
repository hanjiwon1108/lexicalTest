import {
  type LexicalCommand,
  type LexicalEditor,
  type ElementNode,
  type LexicalNode,
  createCommand,
  $getRoot,
  $isElementNode,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

// ============================================================================
// 상수 및 타입
// ============================================================================

const DATA_UNIQUE_ATTRIBUTE = "data-unique" as const;
const MUTATION_LISTENER_PRIORITY = 0 as const;

const Prefix = {
  UNIQUE: "unique",
} as const;

type MutationType = "created" | "updated" | "destroyed";

// ============================================================================
// 커맨드
// ============================================================================

/**
 * 모든 루트 자식 요소에 고유 속성 할당을 수동으로 트리거하는 커맨드
 * @example
 * editor.dispatchCommand(ADD_UNIQUE_ATTRIBUTE_COMMAND, undefined);
 */
export const ADD_UNIQUE_ATTRIBUTE_COMMAND: LexicalCommand<void> = createCommand(
  "ADD_UNIQUE_ATTRIBUTE_COMMAND"
);

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 타임스탬프와 랜덤 접미사를 가진 고유 식별자 생성
 * @param prefix - ID 앞에 붙일 접두사
 * @returns 고유 식별자 문자열
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Lexical 노드에서 DOM 요소를 안전하게 가져오기
 * @param node - DOM을 추출할 Lexical 노드
 * @returns DOM 요소 또는 사용 불가능한 경우 null
 */
function getNodeDOMElement(node: LexicalNode): HTMLElement | null {
  if (!$isElementNode(node)) return null;
  const element = node as ElementNode;
  return (element.__dom as HTMLElement | null) ?? null;
}

/**
 * 노드에서 data-unique 속성 값 가져오기
 * @param node - 확인할 Lexical 노드
 * @returns 속성 값 또는 null
 */
function getUniqueAttributeValue(node: LexicalNode): string | null {
  const dom = getNodeDOMElement(node);
  return dom?.getAttribute(DATA_UNIQUE_ATTRIBUTE) ?? null;
}

/**
 * 노드에 data-unique 속성 설정
 * @param node - 업데이트할 Lexical 노드
 * @param value - 설정할 값
 * @returns 성공 여부
 */
function setUniqueAttributeValue(node: LexicalNode, value: string): boolean {
  const dom = getNodeDOMElement(node);
  if (!dom) return false;

  dom.setAttribute(DATA_UNIQUE_ATTRIBUTE, value);
  return true;
}

// ============================================================================
// 핵심 로직
// ============================================================================

/**
 * 루트 자식 요소들로부터 모든 기존 data-unique 값 수집
 * @returns 기존 고유 값들의 집합
 */
function collectExistingUniqueValues(): Set<string> {
  const root = $getRoot();
  const values = new Set<string>();

  for (const child of root.getChildren()) {
    const value = getUniqueAttributeValue(child);
    if (value) values.add(value);
  }

  return values;
}

/**
 * 필요한 경우 노드에 고유한 data-unique 속성 할당
 * @param node - 처리할 노드
 * @param existingValues - 이미 사용된 값들의 집합 (변경됨)
 * @returns 할당이 수행되었는지 여부
 */
function assignUniqueAttributeIfNeeded(
  node: LexicalNode,
  existingValues: Set<string>
): boolean {
  if (!$isElementNode(node)) return false;

  const currentValue = getUniqueAttributeValue(node);

  // 노드가 이미 유효한 고유 값을 가지고 있으면 건너뛰기
  if (currentValue && !existingValues.has(currentValue)) {
    existingValues.add(currentValue);
    return false;
  }

  // 새 고유 값 생성 및 할당
  const newValue = generateUniqueId(Prefix.UNIQUE);
  const success = setUniqueAttributeValue(node, newValue);

  if (success) {
    existingValues.add(newValue);
  }

  return success;
}

/**
 * 변경된 노드들을 처리하고 고유 속성 할당
 * @param editor - Lexical 에디터 인스턴스
 * @param mutations - 노드 변경 맵
 */
function processMutatedNodes(
  editor: LexicalEditor,
  mutations: Map<string, MutationType>
): void {
  const existingValues = collectExistingUniqueValues();

  for (const [nodeKey, mutation] of mutations) {
    // 생성되거나 업데이트된 노드만 처리
    if (mutation !== "created" && mutation !== "updated") continue;

    editor.getEditorState().read(() => {
      const node = editor.getEditorState()._nodeMap.get(nodeKey);
      if (node) {
        assignUniqueAttributeIfNeeded(node, existingValues);
      }
    });
  }
}

/**
 * 모든 루트 자식 요소를 처리하고 고유 속성 할당
 */
function processAllRootChildren(): void {
  const root = $getRoot();
  const existingValues = collectExistingUniqueValues();

  for (const child of root.getChildren()) {
    assignUniqueAttributeIfNeeded(child, existingValues);
  }
}

// ============================================================================
// 플러그인 컴포넌트
// ============================================================================

/**
 * 에디터의 모든 블록 레벨 노드에 고유한 data-unique 속성을 자동으로 할당하는 Lexical 플러그인
 *
 * 기능:
 * - 노드 생성/업데이트 시 자동 할당
 * - 중복 ID 방지
 * - ADD_UNIQUE_ATTRIBUTE_COMMAND를 통한 수동 트리거
 * - DOM 레벨 속성 관리
 *
 * @example
 * ```tsx
 * <LexicalComposer initialConfig={config}>
 *   <DataUniqueAttributePlugin />
 * </LexicalComposer>
 * ```
 */
export default function DataUniqueAttributePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor) return;

    // 자동 처리를 위한 뮤테이션 리스너 등록
    const unregisterMutationListener = editor.registerMutationListener(
      ElementNode,
      (mutations) => {
        editor.update(() => {
          processMutatedNodes(editor, mutations);
        });
      }
    );

    // 수동 트리거를 위한 커맨드 등록
    const unregisterCommand = editor.registerCommand(
      ADD_UNIQUE_ATTRIBUTE_COMMAND,
      () => {
        editor.update(() => {
          processAllRootChildren();
        });
        return true;
      },
      MUTATION_LISTENER_PRIORITY
    );

    return () => {
      unregisterMutationListener();
      unregisterCommand();
    };
  }, [editor]);

  return null;
}
