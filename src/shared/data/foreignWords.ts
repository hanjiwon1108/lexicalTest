// 외래어 목데이터
export interface ForeignWord {
  word: string;
  replacement: string;
}

export const foreignWordsData: ForeignWord[] = [
  { word: "커피", replacement: "가배" },
  { word: "컴퓨터", replacement: "전산기" },
  { word: "스마트폰", replacement: "똑똑누리손전화기" },
  { word: "인터넷", replacement: "누리망" },
  { word: "마우스", replacement: "쥐" },
  { word: "키보드", replacement: "자판" },
  { word: "모니터", replacement: "화면" },
  { word: "프린터", replacement: "인쇄기" },
  { word: "스캐너", replacement: "주사기" },
  { word: "카메라", replacement: "사진기" },
  { word: "비디오", replacement: "동영상" },
  { word: "오디오", replacement: "음성" },
  { word: "파일", replacement: "문서철" },
  { word: "폴더", replacement: "보관함" },
  { word: "메일", replacement: "우편" },
  { word: "메시지", replacement: "쪽지" },
  { word: "채팅", replacement: "대화" },
  { word: "게임", replacement: "놀이" },
  { word: "레벨", replacement: "수준" },
  { word: "스테이지", replacement: "단계" },
  { word: "캐릭터", replacement: "인물" },
  { word: "아이템", replacement: "물건" },
  { word: "미션", replacement: "임무" },
  { word: "퀘스트", replacement: "과제" },
  { word: "스킬", replacement: "기술" },
  { word: "매직", replacement: "마법" },
  { word: "포인트", replacement: "점수" },
  { word: "랭킹", replacement: "순위" },
  { word: "챔피언", replacement: "우승자" },
  { word: "토너먼트", replacement: "대회" },
  { word: "이준호", replacement: "중국사람" },
];

// 외래어 검사를 위한 헬퍼 함수
export function isForeignWord(text: string): ForeignWord | null {
  const found = foreignWordsData.find(
    (fw) => fw.word.toLowerCase() === text.toLowerCase()
  );
  return found || null;
}

// 텍스트에서 모든 외래어 찾기
export function findForeignWords(text: string): Array<{
  word: string;
  index: number;
  replacement: string;
}> {
  const results: Array<{
    word: string;
    index: number;
    replacement: string;
  }> = [];

  foreignWordsData.forEach((fw) => {
    let index = 0;
    while (index < text.length) {
      const foundIndex = text
        .toLowerCase()
        .indexOf(fw.word.toLowerCase(), index);
      if (foundIndex === -1) break;

      results.push({
        word: fw.word,
        index: foundIndex,
        replacement: fw.replacement,
      });

      index = foundIndex + fw.word.length;
    }
  });

  return results.sort((a, b) => a.index - b.index);
}
