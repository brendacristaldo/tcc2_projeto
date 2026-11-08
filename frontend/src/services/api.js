
const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    token
  } = options;

  const ehFormData = body instanceof FormData;

  const headers = {};

  // Define JSON somente quando o corpo não for FormData
  if (!ehFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    ...(body
      ? {
          body: ehFormData ? body : JSON.stringify(body)
        }
      : {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.mensagem || 'Erro ao comunicar com o servidor.');
  }

  return data;
}
