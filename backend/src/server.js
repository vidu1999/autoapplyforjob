import { createApp } from './app.js';
import { config } from './config.js';
import { ensureStorage } from './services/storage.js';

await ensureStorage();
const app = createApp();
app.listen(config.port, config.host, () => {
  console.log(`AutoApply AI backend listening on http://${config.host}:${config.port}`);
  console.log(`AI provider: ${config.aiProvider}${config.aiProvider === 'ollama' ? ` (${config.ollamaModel})` : ' (safe no-cost templates)'}`);
});
