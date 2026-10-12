const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'config.js'), 'utf8');
const id = 'fc00baf1-f69f-40d6-b9fb-408a4c71df50';
const pending = { id, status: 'pending', created_at: '2026-08-03T15:05:00Z' };
const jsonResponse = (data, ok = true) => ({ ok, json: async () => data });

function createAPI(fetch, options = {}) {
    const context = vm.createContext({
        window: {}, URL, AbortController, setTimeout, clearTimeout, console,
        ...options,
        fetch
    });
    vm.runInContext(source, context, { filename: 'config.js' });
    context.getLocalVideos = options.readLocal || (async () => []);
    return context.window.HoloMapAPI;
}

test('cloud lookup works without the SDK or browser storage', async () => {
    const api = createAPI(async (url, request) => {
        assert.equal(url.pathname, '/rest/v1/rpc/get_video_upload_status');
        assert.equal(request.method, 'POST');
        assert.equal(request.credentials, 'omit');
        assert.equal(request.cache, 'no-store');
        assert.equal(JSON.parse(request.body).p_upload_id, id);
        assert.ok(request.headers.apikey.startsWith('sb_publishable_'));
        assert.equal(request.headers.Authorization, undefined);
        return jsonResponse([pending]);
    }, { readLocal: async () => { throw new Error('Browser storage blocked'); } });
    assert.equal(api.isCloudEnabled(), false);
    assert.deepEqual(await api.fetchUploadStatus(id), pending);
});

test('lookup ignores an expired admin session', async () => {
    const api = createAPI(async () => jsonResponse([pending]), {
        supabase: {
            createClient: () => ({ rpc: () => { throw new Error('Expired admin session'); } })
        }
    });
    assert.deepEqual(await api.fetchUploadStatus(id), pending);
});

test('current cloud status takes priority over a local preview', async () => {
    const api = createAPI(async () => jsonResponse([pending]), {
        readLocal: async () => [{ ...pending, status: 'approved', is_local: true }]
    });
    assert.equal((await api.fetchUploadStatus(id)).status, 'pending');
});

test('normalizes copied IDs and rejects invalid input before requesting', async () => {
    let requests = 0;
    const api = createAPI(async (url, request) => {
        requests++;
        assert.equal(JSON.parse(request.body).p_upload_id, id);
        return jsonResponse([pending]);
    });
    await assert.rejects(api.fetchUploadStatus('invalid'), /Invalid upload ID/);
    assert.equal(requests, 0);
    assert.equal((await api.fetchUploadStatus(' ' + id.toUpperCase() + ' ')).id, id);
});

test('an unknown cloud ID can still identify a local-only preview', async () => {
    const api = createAPI(async () => jsonResponse([]), {
        readLocal: async () => [{ ...pending, status: 'approved', video_url: 'private preview' }]
    });
    const result = await api.fetchUploadStatus(id);
    assert.equal(result.is_local, true);
    assert.equal(result.video_url, undefined);
});

test('unknown IDs return no result', async () => {
    assert.equal(await createAPI(async () => jsonResponse([])).fetchUploadStatus(id), null);
});

test('connection failures are distinguishable and a retry can succeed', async () => {
    let offline = true;
    const api = createAPI(async () => {
        if (offline) throw new TypeError('Failed to fetch');
        return jsonResponse([pending]);
    });
    await assert.rejects(api.fetchUploadStatus(id), { code: 'STATUS_CONNECTION_ERROR' });
    offline = false;
    assert.deepEqual(await api.fetchUploadStatus(id), pending);
});

test('a stalled connection times out', async () => {
    const api = createAPI((url, request) => new Promise((resolve, reject) => {
        request.signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
    }), { setTimeout: callback => setTimeout(callback, 0) });
    await assert.rejects(api.fetchUploadStatus(id), { code: 'STATUS_CONNECTION_ERROR' });
});

test('backend errors and malformed responses do not produce a false success', async () => {
    const failed = createAPI(async () => jsonResponse({ message: 'Function unavailable' }, false));
    await assert.rejects(failed.fetchUploadStatus(id), /Function unavailable/);
    const malformed = createAPI(async () => jsonResponse({ status: 'approved' }));
    await assert.rejects(malformed.fetchUploadStatus(id), /Invalid status lookup response/);
});
