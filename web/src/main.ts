import './style.css';
import { h } from './lib/ui';

type ToolId = 'vfx' | 'sprites' | 'tileset' | 'packer' | 'about';
const TOOLS: { id: ToolId; label: string; icon: string; load: () => Promise<HTMLElement> }[] = [
  { id: 'vfx', label: 'VFX 特效', icon: '✦', load: async () => (await import('./tools/vfx')).vfxTool() },
  { id: 'sprites', label: '角色 / 生物', icon: '☺', load: async () => (await import('./tools/sprites')).spritesTool() },
  { id: 'tileset', label: '地圖圖塊', icon: '▦', load: async () => (await import('./tools/tileset')).tilesetTool() },
  { id: 'packer', label: 'Sprite Sheet 打包', icon: '⧉', load: async () => (await import('./tools/packer')).packerTool() },
  { id: 'about', label: '關於 / 授權', icon: 'ⓘ', load: async () => (await import('./tools/about')).aboutPage() },
];

const app = document.getElementById('app')!;
const content = h('main', { class: 'content' });
const nav = h('nav', { class: 'tabs' });
const cache = new Map<ToolId, HTMLElement>();

async function open(id: ToolId) {
  for (const btn of nav.querySelectorAll('button')) btn.classList.toggle('active', btn.dataset.id === id);
  let page = cache.get(id);
  if (!page) {
    content.replaceChildren(h('div', { class: 'loading' }, '載入中…'));
    try { page = await TOOLS.find(t => t.id === id)!.load(); }
    catch (error) { page = h('div', { class: 'status', 'data-kind': 'error' }, `載入失敗：${(error as Error).message}`); console.error(error); }
    cache.set(id, page);
  }
  content.replaceChildren(page);
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
}

for (const tool of TOOLS) {
  const btn = h('button', { 'data-id': tool.id, onclick: () => open(tool.id) }, h('span', { class: 'tab-icon' }, tool.icon), tool.label);
  nav.append(btn);
}

app.append(h('header', { class: 'topbar' }, h('div', { class: 'brand' }, h('span', { class: 'logo' }, '◆'), 'Asset Forge', h('small', {}, '遊戲素材工坊')), nav), content);
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1) as ToolId;
  if (TOOLS.some(t => t.id === id)) open(id);
});
const initial = location.hash.slice(1) as ToolId;
open(TOOLS.some(t => t.id === initial) ? initial : 'vfx');
