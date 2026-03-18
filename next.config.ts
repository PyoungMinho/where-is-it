import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Strict Mode 비활성화 — 개발 모드의 double-mount가 R3F WebGL context를 파괴함
  reactStrictMode: false,
  turbopack: {
    resolveAlias: {
      // three.js 중복 번들링 방지 (THREE.THREE 오류 원인)
      three: "./node_modules/three/build/three.cjs",
    },
  },
};

export default nextConfig;
