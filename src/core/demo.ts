import { newShape, newText } from './ops';
import { createDoc, openDocState } from './store';

export const isDemo = import.meta.env.MODE === 'demo';
export const downloadUrl = 'https://github.com/Tanvir-Chowdhury/LucentEdit/releases/latest';

/** A fresh, local sample every time; no network images or system fonts required. */
export function openDemoDocument() {
  const doc = createDoc({ name: 'Welcome to LucentEdit', width: 1080, height: 1080, background: '#171d2b' });
  doc.layers = [
    newShape({ name: 'Violet circle', shape: 'ellipse', x: 560, y: 510, w: 660, h: 660, fill: '#7c5cff' }),
    newShape({ name: 'Mint circle', shape: 'ellipse', x: 760, y: 660, w: 320, h: 320, fill: '#8ce6c0' }),
    newShape({ name: 'Outline', shape: 'ellipse', x: 650, y: 580, w: 460, h: 460, fill: null, stroke: { paint: '#ffffff', width: 3 } }),
    newText('LUCENTEDIT / PLAYGROUND', 80, 80, { size: 20, weight: 600, letterSpacing: 3, fill: '#8ce6c0' }),
    newText('Make room\nfor your ideas.', 80, 200, { size: 100, weight: 750, lineHeight: 1.12, fill: '#ffffff' }),
    newText('Pixels, paths, and possibilities.\nTry the tools. Make it yours.', 86, 470, { size: 30, fill: '#c3c9d6', lineHeight: 1.5 }),
    newShape({ name: 'Label background', shape: 'rect', x: 80, y: 900, w: 390, h: 66, radius: 33, fill: '#ffffff' }),
    newText('CREATE SOMETHING NEW', 112, 919, { size: 21, weight: 700, fill: '#171d2b' }),
  ];
  return openDocState(doc, 'Open demo');
}
