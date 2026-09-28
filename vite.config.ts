import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 이면 파일 하나(index.html)로 묶는다. 기본은 홈랩용 일반 빌드(dist/).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: process.env.SINGLE ? [viteSingleFile()] : [],
  build: { outDir: process.env.SINGLE ? 'dist-single' : 'dist' },
}));
