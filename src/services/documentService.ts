import api from './api';

const DOC_BASE = '/api/v1/documents';

export interface PersistDocumentParams {
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  type: string;
  fileName?: string;
  content: string; // base64-encoded PDF
}

export interface DocumentRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  type: string;
  fileName: string;
  storageUrl: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
}

class DocumentService {
  /**
   * Persist a generated PDF document to the backend.
   * Fire-and-forget — callers should `.catch()` to avoid unhandled rejections.
   */
  async persistDocument(params: PersistDocumentParams): Promise<DocumentRecord> {
    const res: any = await api.post(`${DOC_BASE}/generate`, {
      patientId: params.patientId,
      encounterId: params.encounterId,
      admissionId: params.admissionId,
      type: params.type,
      fileName: params.fileName,
      content: params.content,
    });
    return res.data;
  }

  async getDocument(id: string): Promise<DocumentRecord> {
    const res: any = await api.get(`${DOC_BASE}/${id}`);
    return res.data;
  }

  async listDocuments(patientId: string, type?: string): Promise<DocumentRecord[]> {
    const params: any = { patientId };
    if (type) params.type = type;
    const res: any = await api.get(DOC_BASE, { params });
    return res.data;
  }

  async getDownloadUrl(id: string): Promise<string> {
    return `${DOC_BASE}/${id}/download`;
  }
}

const documentService = new DocumentService();
export default documentService;
