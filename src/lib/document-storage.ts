import { deletePrivateDocument, downloadPrivateDocument } from './supabase';

const DATABASE_NAME = 'somente-crm-documentos';
const DATABASE_VERSION = 1;
const STORE_NAME = 'arquivos';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Armazenamento local de arquivos indisponível neste navegador.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento de documentos.'));
  });
}

export async function saveDocumentFile(id: string, file: File): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(file, id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Não foi possível salvar o arquivo.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('O armazenamento do arquivo foi cancelado.'));
    };
  });
}

export async function deleteDocumentFile(id: string): Promise<void> {
  if (id.includes('/')) return deletePrivateDocument(id);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Não foi possível remover o arquivo.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('A remoção do arquivo foi cancelada.'));
    };
  });
}

export async function downloadDocumentFile(id: string, filename: string): Promise<void> {
  if (id.includes('/')) return downloadPrivateDocument(id, filename);
  const database = await openDatabase();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível ler o arquivo.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Não foi possível ler o arquivo.'));
    };
  });

  if (!blob) throw new Error('Arquivo não encontrado neste navegador.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
