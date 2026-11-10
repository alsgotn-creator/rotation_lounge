import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '플러팅 라운지 · 로테이션 소개팅',
  description: '15분씩, 일곱 번의 설렘. 서로 고른 사람만 연결돼요.',
};
// viewportFit cover 가 있어야 iOS 홈 화면 앱에서 env(safe-area-inset-bottom) 값이 들어온다 (하단 고정 버튼 .ft)
export const viewport: Viewport = { themeColor: '#f4f4f5', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Gaegu:wght@400;700&family=Gamja+Flower&family=Hi+Melody&family=Poor+Story&display=swap" />
      </head>
      <body><div className="app">{children}</div></body>
    </html>
  );
}
