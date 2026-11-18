import JSZip from 'jszip';

const LEGACY_KEY = 'somente:crm:v3';
const DATABASE_NAME = 'somente-crm-documentos';
const STORE_NAME = 'arquivos';

export interface LegacyAttachment {
  oldId: string;
  archivePath: string;
  name: string;
  type: string;
  size: number;
}

export interface LegacyManifest {
  format: 'somente-crm-legacy';
  version: 1;
  exportedAt: string;
  candidateCount: number;
  attachmentCount: number;
  missingAttachmentIds: string[];
  attachments: LegacyAttachment[];
  excluded: string[];
}

export interface LegacyBundle {
  manifest: LegacyManifest;
  state: Record<string, unknown>;
  archive: JSZip;
}

function openLegacyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('O navegador não disponibiliza o armazenamento de documentos.'));
    const request = indexedDB.open(DATABASE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento de documentos antigo.'));
  });
}

async function readLegacyBlob(id: string): Promise<Blob | undefined> {
  const database = await openLegacyDatabase();
  if (!database.objectStoreNames.contains(STORE_NAME)) {
    database.close();
    return undefined;
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível ler um documento antigo.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Não foi possível ler um documento antigo.'));
    };
  });
}

const credentialKey = /^(password|password_hash|senha|token|access_?token|refresh_?token|authorization|service_?role_?key|session|credentials)$/i;

function removeNestedCredentials(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeNestedCredentials);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !credentialKey.test(key))
    .map(([key, nested]) => [key, removeNestedCredentials(nested)]));
}

function sanitizedState(parsed: Record<string, unknown>): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  delete copy.user;
  delete copy.teamAccounts;
  delete copy.session;
  delete copy.accessToken;
  delete copy.refreshToken;
  return removeNestedCredentials(copy) as Record<string, unknown>;
}

export async function exportLegacyBundle(): Promise<{ file: Blob; manifest: LegacyManifest }> {
  if (typeof window === 'undefined') throw new Error('A exportação deve ser executada no navegador que contém os dados antigos.');
  const stored = window.localStorage.getItem(LEGACY_KEY);
  if (!stored) throw new Error('Não encontramos a base antiga neste navegador. Abra o sistema antigo no mesmo navegador antes de exportar.');
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(stored) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    parsed = value as Record<string, unknown>;
  } catch {
    throw new Error('A base antiga não está em um formato válido; nenhum dado foi alterado.');
  }

  const state = sanitizedState(parsed);
  const candidates = Array.isArray(state.candidatos) ? state.candidatos : [];
  const referenced = new Map<string, { name: string; type: string; size: number }>();
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const documents = (candidate as Record<string, unknown>).documentos;
    if (!Array.isArray(documents)) continue;
    for (const document of documents) {
      if (!document || typeof document !== 'object') continue;
      const doc = document as Record<string, unknown>;
      if (typeof doc.arquivoId === 'string' && doc.arquivoId) {
        referenced.set(doc.arquivoId, {
          name: typeof doc.arquivoNome === 'string' ? doc.arquivoNome : 'documento',
          type: typeof doc.arquivoTipo === 'string' ? doc.arquivoTipo : 'application/octet-stream',
          size: Number(doc.arquivoTamanho) || 0,
        });
      }
    }
  }

  const zip = new JSZip();
  const attachments: LegacyAttachment[] = [];
  const missingAttachmentIds: string[] = [];
  let sequence = 0;
  for (const [oldId, metadata] of referenced) {
    const blob = await readLegacyBlob(oldId).catch(() => undefined);
    if (!blob) {
      missingAttachmentIds.push(oldId);
      continue;
    }
    const archivePath = `attachments/${String(sequence++).padStart(5, '0')}.bin`;
    zip.file(archivePath, blob);
    attachments.push({ oldId, archivePath, name: metadata.name || `documento-${sequence}`, type: blob.type || metadata.type, size: blob.size || metadata.size });
  }

  const manifest: LegacyManifest = {
    format: 'somente-crm-legacy',
    version: 1,
    exportedAt: new Date().toISOString(),
    candidateCount: candidates.length,
    attachmentCount: attachments.length,
    missingAttachmentIds,
    attachments,
    excluded: ['contas e senhas locais da equipe', 'sessão de usuário ativa'],
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('state.json', JSON.stringify(state));
  const file = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } });
  return { file, manifest };
}

export async function readLegacyBundle(file: File): Promise<LegacyBundle> {
  const archive = await JSZip.loadAsync(file);
  const manifestFile = archive.file('manifest.json');
  const stateFile = archive.file('state.json');
  if (!manifestFile || !stateFile) throw new Error('O arquivo não parece ser uma exportação do Portal Somente.');
  const manifest = JSON.parse(await manifestFile.async('text')) as LegacyManifest;
  const state = JSON.parse(await stateFile.async('text')) as Record<string, unknown>;
  if (manifest.format !== 'somente-crm-legacy' || manifest.version !== 1 || !Array.isArray(state.candidatos)) {
    throw new Error('Formato de migração não reconhecido. Nenhum dado foi enviado.');
  }
  return { manifest, state, archive };
}
