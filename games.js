import { bootPage } from './page-boot.js';
import { startPresence } from './presence.js';
const { data, viewer } = await bootPage();
startPresence(data, viewer, 'games');
await import('./game-panel.js');
