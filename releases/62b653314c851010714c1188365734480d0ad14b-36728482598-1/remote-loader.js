const owner = 'yissok';
const namePattern = /^[a-z0-9][a-z0-9-]*$/;
const assetPathPattern = /^[A-Za-z0-9_][A-Za-z0-9._/-]*$/;
const globalPattern = /^__sveltekit_[A-Za-z0-9_]+$/;
const target = document.querySelector('#app');

function fail(message) {
  document.title = 'Application unavailable';
  target.textContent = message;
}

function appNameFromPath() {
  return location.pathname.split('/').filter(Boolean)[0] ?? '';
}

function remoteOrigin(app) {
  return `https://${owner}.github.io/${app}-dist/`;
}

function validAssetPath(path) {
  return typeof path === 'string'
    && assetPathPattern.test(path)
    && !path.includes('..')
    && !path.includes('//');
}

async function load() {
  const app = appNameFromPath();
  if (!namePattern.test(app)) return fail('Application not found.');

  const origin = remoteOrigin(app);
  let manifest;
  try {
    const response = await fetch(`${origin}manifest.json`, { cache: 'no-store' });
    if (!response.ok) return fail('Application not found.');
    manifest = await response.json();
  } catch {
    return fail('Application is temporarily unavailable.');
  }

  if (manifest?.version !== 1 || manifest.app !== app || !globalPattern.test(manifest.global)
    || !validAssetPath(manifest.start) || !validAssetPath(manifest.appEntry)) {
    return fail('Application deployment is invalid.');
  }

  try {
    globalThis[manifest.global] = {
      base: `/${app}`,
      assets: origin.slice(0, -1)
    };
    const [kit, application] = await Promise.all([
      import(new URL(manifest.start, origin).href),
      import(new URL(manifest.appEntry, origin).href)
    ]);
    if (typeof kit.start !== 'function') return fail('Application entrypoint is invalid.');
    target.textContent = '';
    await kit.start(application, target);
  } catch (error) {
    console.error('Could not start remote application', error);
    fail('Application could not be loaded.');
  }
}

void load();
