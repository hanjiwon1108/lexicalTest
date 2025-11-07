import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, TextNode } from "lexical";
import { useEffect, useMemo } from "react";
import {
  $createForeignWordNode,
  $isForeignWordNode,
  ForeignWordNode,
} from "../shared/nodes/ForeignWordNode";
import { foreignWordsData } from "../shared/data/foreignWords";
import { Trie } from "../shared/utils/Trie";

export default function ForeignWordPlugin(): null {
  const [editor] = useLexicalComposerContext();

  const foreignWordTrie = useMemo(() => {
    const trie = new Trie();
    foreignWordsData.forEach((fw) => {
      trie.insert(fw.word, fw.replacement);
    });
    return trie;
  }, []);

  useEffect(() => {
    if (!editor.hasNodes([ForeignWordNode])) {
      throw new Error(
        "ForeignWordPlugin: ForeignWordNode not registered on editor"
      );
    }

    // ForeignWordNode가 변경되었을 때 처리
    const removeForeignWordTransform = editor.registerNodeTransform(
      ForeignWordNode,
      (node: ForeignWordNode) => {
        const text = node.getTextContent();

        // Trie를 사용하여 외래어 여부 확인
        if (!foreignWordTrie.search(text)) {
          const textNode = new TextNode(text);
          node.replace(textNode);
        }
      }
    );

    const removeTextNodeTransform = editor.registerNodeTransform(
      TextNode,
      (textNode: TextNode) => {
        // ForeignWordNode는 이미 처리되었으므로 건너뜀
        if ($isForeignWordNode(textNode)) {
          return;
        }

        const text = textNode.getTextContent();
        if (!text || text.length === 0) {
          return;
        }

        // Trie를 사용하여 모든 외래어 매치 찾기 (O(n) 복잡도)
        const matches = foreignWordTrie.findAllMatches(text);

        if (matches.length === 0) {
          return;
        }

        // 순방향으로 처리 (노드를 분할하면서 진행)
        let currentNode: TextNode = textNode;
        let processedLength = 0;

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const relativeStart = match.start - processedLength;

          // 현재 노드의 텍스트 길이
          const currentText = currentNode.getTextContent();

          if (relativeStart < 0 || relativeStart >= currentText.length) {
            continue;
          }

          let targetNode: TextNode = currentNode;

          // 시작 부분 분할
          if (relativeStart > 0) {
            const [before, after] = currentNode.splitText(relativeStart);
            targetNode = after as TextNode;
            processedLength += before.getTextContent().length;
          }

          // 끝 부분 분할
          const targetText = targetNode.getTextContent();
          const matchLength = match.end - match.start;

          if (matchLength < targetText.length) {
            const [matchPart, remaining] = targetNode.splitText(matchLength);
            targetNode = matchPart as TextNode;
            currentNode = remaining as TextNode;
          } else {
            // 다음 매치를 위해 다음 형제 노드로 이동
            const nextSibling = targetNode.getNextSibling();
            if (nextSibling instanceof TextNode) {
              currentNode = nextSibling;
            }
          }

          // TextNode를 ForeignWordNode로 교체
          const foreignWordNode = $createForeignWordNode(
            match.word,
            match.replacement
          );
          targetNode.replace(foreignWordNode);

          processedLength += matchLength;
        }
      }
    );

    return () => {
      removeForeignWordTransform();
      removeTextNodeTransform();
    };
  }, [editor, foreignWordTrie]);

  // 외래어 클릭 이벤트 처리
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains("foreign-word-highlight")) {
        const replacement = target.getAttribute("data-replacement");
        const originalText = target.textContent;
        const nodeKey = target.getAttribute("data-lexical-node-key");

        if (replacement && originalText && nodeKey) {
          const confirmChange = window.confirm(
            `"${originalText}"를 "${replacement}"(으)로 변경하시겠습니까?`
          );

          if (confirmChange) {
            editor.update(() => {
              const node = $getNodeByKey(nodeKey);
              if (node && $isForeignWordNode(node)) {
                const textNode = new TextNode(replacement);
                node.replace(textNode);
              }
            });
          }
        }
      }
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener("click", handleClick);
      return () => {
        editorElement.removeEventListener("click", handleClick);
      };
    }
  }, [editor]);

  return null;
}
