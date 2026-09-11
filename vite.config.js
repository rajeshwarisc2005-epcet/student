import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const groqKey = env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || '';

  return {
    base: './',
    define: {
      __GROQ_API_KEY__: JSON.stringify(groqKey),
      'process.env.GROQ_API_KEY': JSON.stringify(groqKey)
    },
    server: {
      port: 5173,
      host: true
    }
  };
});
