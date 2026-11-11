import type { NextConfig } from 'next';

// CSS(약 12KB)를 HTML 안에 넣어서, 따로 받아올 때까지 화면이 하얗게 기다리지 않게 한다 (느린 폰 회선에서 첫 화면이 ~0.8초 늦었다)
const config: NextConfig = { experimental: { inlineCss: true } };

export default config;
