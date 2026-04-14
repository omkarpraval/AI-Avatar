import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { setItem, getItem } from '../utils/storage';
import { saveDocumentFile, loadDocumentFile } from '../utils/fileStore';

function persistableDocs(docs) {
  // Blob/object URLs are not valid across reloads; do not persist them.
  return (docs || []).map(({ fileUrl, ...rest }) => rest);
}

export const useDocumentStore = create((set, get) => ({
  documents: getItem('documents', []),
  currentDocumentId: null,

  setDocuments: (docs) => {
    set({ documents: docs });
    setItem('documents', persistableDocs(docs));
  },

  // serverDocs: response from backend; originalFiles: File[] from upload
  addUploadedDocuments: async (serverDocs, originalFiles = []) => {
    const mapped = [];

    for (const doc of serverDocs) {
      const id = uuid();
      const matchingFile = originalFiles.find((f) => f.name === doc.name);
      const fileUrl = matchingFile ? URL.createObjectURL(matchingFile) : null;

      // Ensure the binary is written before we navigate away
      if (matchingFile && doc.type === 'pdf') {
        await saveDocumentFile(id, matchingFile);
        // Fallback key (helps if localStorage doc ids change)
        await saveDocumentFile(`name:${doc.name}`, matchingFile);
      }

      mapped.push({
        id,
        name: doc.name,
        type: doc.type,
        sizeBytes: doc.sizeBytes,
        pages: doc.pages,
        fileUrl,
      });
    }

    const next = [...get().documents, ...mapped];
    set({ documents: next, currentDocumentId: next[0]?.id ?? null });
    setItem('documents', persistableDocs(next));
  },

  hydrateFileUrls: async () => {
    const docs = get().documents || [];
    const withUrls = await Promise.all(
      docs.map(async (doc) => {
        if (doc?.type !== 'pdf') return doc;
        if (doc.fileUrl) return doc;
        const file =
          (await loadDocumentFile(doc.id)) ||
          (await loadDocumentFile(`name:${doc.name}`));
        if (!file) return doc;
        return { ...doc, fileUrl: URL.createObjectURL(file) };
      })
    );
    set({ documents: withUrls });
  },
}));

