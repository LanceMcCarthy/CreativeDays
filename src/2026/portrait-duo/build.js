import { cp, copyFile, mkdir, writeFile } from 'node:fs/promises';

await mkdir(new URL('./dist', import.meta.url), { recursive: true });
await cp(new URL('./public', import.meta.url), new URL('./dist', import.meta.url), { recursive: true });
await copyFile(
  new URL('./node_modules/socket.io/client-dist/socket.io.esm.min.js', import.meta.url),
  new URL('./dist/socket.io.esm.min.js', import.meta.url),
);
const signalingUrl = process.env.SIGNALING_URL ?? '';
if (signalingUrl) {
  const parsed = new URL(signalingUrl);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== signalingUrl.replace(/\/$/, '')) {
    throw new Error('SIGNALING_URL doit être une origine HTTP(S), sans chemin.');
  }
}
await writeFile(
  new URL('./dist/config.js', import.meta.url),
  `window.DUO_CONFIG = ${JSON.stringify({ signalingUrl: signalingUrl.replace(/\/$/, '') })};\n`,
);
console.log('Site statique prêt dans dist/. Un serveur temps réel est requis pour les salons.');
