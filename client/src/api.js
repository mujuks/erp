async function request(url, options) {
  const res = await fetch(url, options);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const jsonInit = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, jsonInit('POST', body)),
  put: (url, body) => request(url, jsonInit('PUT', body)),
  del: (url) => request(url, { method: 'DELETE' })
};
