// External service API keys — stored in localStorage
// Used by any module that needs to call external services (Serasa, Google, etc.)
const STORAGE_KEY = 'zia_service_keys_v1';

export interface ServiceKey {
  id: string;
  name: string;        // display name, e.g. "Serasa Experian"
  service: string;     // slug, e.g. "serasa", "google-search", "receita-ws"
  apiKey: string;
  endpoint?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

function load(): ServiceKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ServiceKey[]) : [];
  } catch { return []; }
}

function save(keys: ServiceKey[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); } catch { /* ignore */ }
}

export function getAllServiceKeys(): ServiceKey[] { return load(); }

export function getServiceApiKey(service: string): string | null {
  const found = load().find(
    k => k.isActive && k.service.toLowerCase() === service.toLowerCase(),
  );
  return found?.apiKey ?? null;
}

export function addServiceKey(data: Omit<ServiceKey, 'id' | 'createdAt'>): ServiceKey {
  const newKey: ServiceKey = {
    ...data,
    id: `svc-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  save([...load(), newKey]);
  return newKey;
}

export function updateServiceKey(id: string, changes: Partial<Omit<ServiceKey, 'id' | 'createdAt'>>) {
  save(load().map(k => (k.id === id ? { ...k, ...changes } : k)));
}

export function removeServiceKey(id: string) {
  save(load().filter(k => k.id !== id));
}
