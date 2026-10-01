(() => {
  if (window.mapConsole) return;
  const entries = [];
  const listeners = new Set();
  const format = value => {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  const add = (level, args) => {
    entries.push(`${new Date().toISOString()} [${level}] ${args.map(format).join(' ')}`.slice(0, 10000));
    if (entries.length > 300) entries.shift();
    for (const listener of listeners) listener(entries.join('\n\n'));
  };
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[level].bind(console);
    console[level] = (...args) => { original(...args); add(level, args); };
  }
  window.addEventListener('error', event => {
    if (event.target !== window) {
      const target = event.target;
      add('resource error', [target?.src || target?.href || target?.tagName]);
    } else add('uncaught error', [event.error || event.message, `${event.filename}:${event.lineno}:${event.colno}`]);
  }, true);
  window.addEventListener('unhandledrejection', event => add('unhandled promise', [event.reason]));
  window.mapConsole = {
    subscribe(listener) { listeners.add(listener); listener(entries.join('\n\n')); return () => listeners.delete(listener); },
    clear() { entries.length = 0; for (const listener of listeners) listener(''); },
    inspectMap() {
      const el = document.getElementById('map');
      const tiles = [...document.querySelectorAll('img.leaflet-tile')];
      add('map snapshot', [{ url: location.href, online: navigator.onLine,
        leaflet: typeof window.L, map: !!window.map, container: el?.getBoundingClientRect().toJSON(),
        overlay: !!document.getElementById('map-loading-overlay'),
        tiles: tiles.length, loaded: tiles.filter(t => t.complete && t.naturalWidth > 0).length,
        firstTile: tiles[0]?.src }]);
    }
  };
  add('startup', [location.href, { online: navigator.onLine }]);
})();
