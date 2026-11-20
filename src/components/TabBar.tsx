'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';

/** 첫 화면 쪽 하단 떠 있는 탭 바: 누르면 각 페이지가 열린다 */
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: '일정', icon: 'calendar' },
  { href: '/reviews', label: '후기', icon: 'heart' },
  { href: '/faq', label: 'FAQ', icon: 'help' },
  { href: '/contact', label: '문의하기', icon: 'chat' },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="lp-tab" aria-label="메뉴">
      <div className="lp-pill">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={path === t.href ? 'on' : undefined} aria-current={path === t.href ? 'page' : undefined}>
            <Icon name={t.icon} />{t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
