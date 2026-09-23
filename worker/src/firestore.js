// The little bit of Firestore REST we need. We sign in as one member account,
// so the existing security rules apply unchanged and no service-account key has
// to exist anywhere. Pure fetch, so it runs unmodified in a Worker.

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const FIRESTORE = 'https://firestore.googleapis.com/v1';

export async function signIn({ apiKey, email, password }) {
  const response = await fetch(`${IDENTITY}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`sign-in failed: ${payload?.error?.message || response.status}`);
  }
  return { idToken: payload.idToken, uid: payload.localId };
}

export function createClient({ projectId, idToken }) {
  const root = `${FIRESTORE}/projects/${projectId}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };

  async function call(path, options = {}) {
    const response = await fetch(path.startsWith('http') ? path : `${root}${path}`, { ...options, headers });
    if (response.status === 404) return { missing: true };
    const text = await response.text();
    if (!response.ok) throw new Error(`firestore ${response.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  }

  return {
    root,
    async list(collectionPath) {
      const payload = await call(`/${collectionPath}?pageSize=300`);
      if (payload.missing) return [];
      return (payload.documents || []).map(readDocument);
    },
    async get(documentPath) {
      const payload = await call(`/${documentPath}`);
      return payload.missing ? null : readDocument(payload);
    },
    // Equality/ordering on a single field only, so Firestore's automatic
    // single-field index covers it and nobody has to create a composite one.
    async dueFrom(collectionPath, field, atOrBefore, limit = 50) {
      const parent = collectionPath.split('/').slice(0, -1).join('/');
      const collectionId = collectionPath.split('/').pop();
      const payload = await call(`/${parent}:runQuery`, {
        method: 'POST',
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId }],
            where: {
              fieldFilter: {
                field: { fieldPath: field },
                op: 'LESS_THAN_OR_EQUAL',
                value: { integerValue: String(atOrBefore) }
              }
            },
            orderBy: [{ field: { fieldPath: field }, direction: 'ASCENDING' }],
            limit
          }
        })
      });
      if (payload.missing) return [];
      return (Array.isArray(payload) ? payload : [])
        .filter(row => row.document)
        .map(row => readDocument(row.document));
    },
    async remove(documentPath) {
      await call(`/${documentPath}`, { method: 'DELETE' });
    }
  };
}

function readDocument(document) {
  const id = document.name.split('/').pop();
  const fields = {};
  for (const [key, value] of Object.entries(document.fields || {})) fields[key] = readValue(value);
  return { id, path: document.name.split('/documents/')[1], ...fields };
}

function readValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return Date.parse(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(readValue);
  if ('mapValue' in value) {
    const out = {};
    for (const [key, nested] of Object.entries(value.mapValue.fields || {})) out[key] = readValue(nested);
    return out;
  }
  return null;
}
