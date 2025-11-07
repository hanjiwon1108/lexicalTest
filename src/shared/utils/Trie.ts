// Trie 자료구조를 사용한 외래어 검색 최적화
interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  word?: string;
  replacement?: string;
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = this.createNode();
  }

  private createNode(): TrieNode {
    return {
      children: new Map(),
      isEndOfWord: false,
    };
  }

  // 단어 삽입
  insert(word: string, replacement: string): void {
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, this.createNode());
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    current.word = word;
    current.replacement = replacement;
  }

  // 텍스트에서 모든 외래어 매치 찾기
  findAllMatches(text: string): Array<{
    start: number;
    end: number;
    word: string;
    replacement: string;
  }> {
    const matches: Array<{
      start: number;
      end: number;
      word: string;
      replacement: string;
    }> = [];

    for (let i = 0; i < text.length; i++) {
      let current = this.root;
      let j = i;

      // 현재 위치에서 가능한 가장 긴 매치 찾기
      let lastMatch: {
        end: number;
        word: string;
        replacement: string;
      } | null = null;

      while (j < text.length && current.children.has(text[j])) {
        current = current.children.get(text[j])!;
        j++;

        // 완전한 단어를 찾았을 때
        if (current.isEndOfWord && current.word && current.replacement) {
          lastMatch = {
            end: j,
            word: current.word,
            replacement: current.replacement,
          };
        }
      }

      // 가장 긴 매치를 결과에 추가
      if (lastMatch) {
        matches.push({
          start: i,
          end: lastMatch.end,
          word: lastMatch.word,
          replacement: lastMatch.replacement,
        });
      }
    }

    // 겹치는 매치 제거
    return this.removeOverlappingMatches(matches);
  }

  // 겹치는 매치 제거 (가장 긴 것 우선)
  private removeOverlappingMatches(
    matches: Array<{
      start: number;
      end: number;
      word: string;
      replacement: string;
    }>
  ): Array<{
    start: number;
    end: number;
    word: string;
    replacement: string;
  }> {
    if (matches.length === 0) return [];

    // 시작 위치로 정렬, 같은 위치면 길이가 긴 것 우선
    const sorted = matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - b.start - (a.end - a.start);
    });

    const result: typeof matches = [];
    let lastEnd = -1;

    for (const match of sorted) {
      // 겹치지 않는 매치만 추가
      if (match.start >= lastEnd) {
        result.push(match);
        lastEnd = match.end;
      }
    }

    return result;
  }

  // 특정 단어가 Trie에 존재하는지 확인
  search(word: string): boolean {
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        return false;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord;
  }

  // 특정 단어의 교체어 가져오기
  getReplacement(word: string): string | null {
    let current = this.root;

    for (const char of word) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }

    return current.isEndOfWord && current.replacement
      ? current.replacement
      : null;
  }
}
