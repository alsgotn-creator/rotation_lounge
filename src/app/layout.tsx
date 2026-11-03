import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '플러팅 라운지 · 로테이션 소개팅',
  description: '15분씩, 일곱 번의 설렘. 서로 고른 사람만 연결돼요.',
};
export const viewport: Viewport = { themeColor: '#0a122f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body><div className="app">{children}</div></body>
    </html>
  );
}
