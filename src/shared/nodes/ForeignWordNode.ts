import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
} from "lexical";

import { $applyNodeReplacement, TextNode } from "lexical";

export type SerializedForeignWordNode = Spread<
  {
    replacement: string;
  },
  SerializedTextNode
>;

function convertForeignWordElement(
  domNode: HTMLElement
): DOMConversionOutput | null {
  const textContent = domNode.textContent;
  const replacement = domNode.getAttribute("data-replacement");

  if (textContent !== null && replacement !== null) {
    const node = $createForeignWordNode(textContent, replacement);
    return {
      node,
    };
  }

  return null;
}

export class ForeignWordNode extends TextNode {
  __replacement: string;

  static getType(): string {
    return "foreign-word";
  }

  static clone(node: ForeignWordNode): ForeignWordNode {
    return new ForeignWordNode(node.__text, node.__replacement, node.__key);
  }

  static importJSON(
    serializedNode: SerializedForeignWordNode
  ): ForeignWordNode {
    const node = $createForeignWordNode(
      serializedNode.text,
      serializedNode.replacement
    );
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(text: string, replacement: string, key?: NodeKey) {
    super(text, key);
    this.__replacement = replacement;
  }

  exportJSON(): SerializedForeignWordNode {
    return {
      ...super.exportJSON(),
      replacement: this.__replacement,
      type: "foreign-word",
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.backgroundColor = "#ffe6e6";
    element.style.borderBottom = "2px solid #ff4444";
    element.style.cursor = "pointer";
    element.style.padding = "2px 4px";
    element.style.borderRadius = "3px";
    element.className = "foreign-word-highlight";
    element.setAttribute("data-replacement", this.__replacement);
    element.setAttribute("data-lexical-node-key", this.__key);
    element.title = `외래어: ${this.__text} → ${this.__replacement}`;
    return element;
  }

  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    _config: EditorConfig
  ): boolean {
    const isUpdated = super.updateDOM(prevNode as this, dom, _config);
    if (
      $isForeignWordNode(prevNode) &&
      prevNode.__replacement !== this.__replacement
    ) {
      dom.setAttribute("data-replacement", this.__replacement);
      dom.title = `외래어: ${this.__text} → ${this.__replacement}`;
    }
    return isUpdated;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-foreign-word", "true");
    element.setAttribute("data-replacement", this.__replacement);
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-foreign-word")) {
          return null;
        }
        return {
          conversion: convertForeignWordElement,
          priority: 1,
        };
      },
    };
  }

  getReplacement(): string {
    return this.__replacement;
  }

  setReplacement(replacement: string): void {
    const writable = this.getWritable();
    writable.__replacement = replacement;
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createForeignWordNode(
  text: string,
  replacement: string
): ForeignWordNode {
  return $applyNodeReplacement(new ForeignWordNode(text, replacement));
}

export function $isForeignWordNode(
  node: LexicalNode | null | undefined
): node is ForeignWordNode {
  return node instanceof ForeignWordNode;
}
