import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '';

export const SUPABASE_CONFIGURED = Boolean(url && publicKey);

// Nunca usar a chave service_role no bundle do navegador.
export const supabase = createClient(
  url || 'https://not-configured.supabase.co',
  publicKey || 'not-configured-public-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'somente.auth.v1',
    },
  },
);

export function requireSupabase(): void {
  if (!SUPABASE_CONFIGURED) {
    throw new Error('O projeto ainda não está conectado ao Supabase. Configure VITE_SUPABASE_URL e a chave pública no GitHub Actions.');
  }
}

export function cpfAuthEmail(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) throw new Error('Informe um CPF com 11 dígitos.');
  return `cpf-${digits}@somente.invalid`;
}

export async function getPublicState() {
  requireSupabase();
  const { data, error } = await supabase.rpc('get_public_state');
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function getAuthenticatedState() {
  requireSupabase();
  const { data, error } = await supabase.rpc('get_my_state');
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function saveApplicationState(patch: Record<string, unknown>) {
  requireSupabase();
  const { data, error } = await supabase.rpc('save_my_state', { p_patch: patch });
  if (error) throw error;
  return data;
}

function safeFileName(name: string): string {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'arquivo';
}

export async function uploadCandidateDocument(candidateId: string, documentId: string, file: File): Promise<string> {
  requireSupabase();
  const path = `${candidateId}/${safeFileName(documentId)}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from('professional-documents').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function downloadPrivateDocument(path: string, filename: string): Promise<void> {
  requireSupabase();
  const { data, error } = await supabase.storage.from('professional-documents').download(path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function deletePrivateDocument(path: string): Promise<void> {
  requireSupabase();
  const { error } = await supabase.storage.from('professional-documents').remove([path]);
  if (error) throw error;
}

export async function uploadTrainingVideo(trackId: string, lessonId: string, file: File): Promise<string> {
  requireSupabase();
  if (!file.type.startsWith('video/')) throw new Error('Selecione um arquivo de vídeo.');
  if (file.size > 50 * 1024 * 1024) throw new Error('O vídeo precisa ter no máximo 50 MB.');
  const path = `${safeFileName(trackId)}/${safeFileName(lessonId)}-${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from('training-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
    metadata: { published: 'true' },
  });
  if (error) throw error;
  return path;
}

export async function getTrainingVideoUrl(path: string): Promise<string> {
  if (!path || /^https?:\/\//i.test(path)) return path;
  requireSupabase();
  const { data, error } = await supabase.storage.from('training-media').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
