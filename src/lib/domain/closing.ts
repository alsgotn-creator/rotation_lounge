/** 마무리 화면에서 받는 신청 (호스트가 진행 화면에서 따로 본다) */
export type ClosingKind = 'afterparty' | 'again' | 'rotation' | 'solo';
export const CLOSING_KINDS: ClosingKind[] = ['afterparty', 'again', 'rotation', 'solo'];
export const CLOSING_LABEL: Record<ClosingKind, string> = {
  afterparty: '오늘 뒷풀이 참여',
  again: '모임 한 번 더 참여 (20% 할인)',
  rotation: '1:1 로테이션 신청 (20% 할인)',
  solo: '나는솔로 토론회 참여',
};
