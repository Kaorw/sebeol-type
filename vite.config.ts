import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 이면 파일 하나(index.html)로 묶는다. 기본은 홈랩용 일반 빌드(dist/).
// 일반 빌드에는 세모이 배열·결합 법칙 안내 페이지(semoe.html)도 함께 낸다.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  build: {
    outDir: process.env.SINGLE ? 'dist-single' : 'dist',
    ...(process.env.SINGLE ? {} : { rolldownOptions: { input: { main: 'index.html', semoe: 'semoe.html' } } }),
  },
}));
