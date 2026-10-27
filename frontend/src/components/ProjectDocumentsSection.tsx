import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Download,
  History,
  Plus,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import { documentsApi } from '../services/api';
import { DocumentDto, DocumentType } from '../types';

interface ProjectDocumentsSectionProps {
  projectId: string;
  projectTitle: string;
  userRole?: 'STUDENT' | 'FACULTY' | 'ADMIN';
  canUpload?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, { title: string; desc: string }> = {
  PROPOSAL: {
    title: 'Project Proposal',
    desc: 'Initial concept, domain scope, and feasibility proposal',
  },
  SRS: {
    title: 'Software Requirements Spec (SRS)',
    desc: 'Functional requirements, use cases, and system specifications',
  },
  ARCHITECTURE_DESIGN: {
    title: 'Architecture & System Design',
    desc: 'High-level architectures, UML models, and pipeline diagrams',
  },
  MID_TERM_REPORT: {
    title: 'Mid-Term Evaluation Report',
    desc: 'Empirical results, baseline metrics, and intermediate milestone report',
  },
  FINAL_THESIS: {
    title: 'Final Thesis / Capstone Report',
    desc: 'Comprehensive project thesis adhering to institution format',
  },
  PRESENTATION: {
    title: 'Viva & Defense Presentation',
    desc: 'Slides deck for committee appraisal and oral defense',
  },
  SOURCE_CODE_ZIP: {
    title: 'Source Code Archive (.ZIP)',
    desc: 'Repository bundle, test scripts, and model weight weights link',
  },
};

const ALL_TYPES: DocumentType[] = [
  'PROPOSAL',
  'SRS',
  'ARCHITECTURE_DESIGN',
  'MID_TERM_REPORT',
  'FINAL_THESIS',
  'PRESENTATION',
  'SOURCE_CODE_ZIP',
];

export const ProjectDocumentsSection: React.FC<ProjectDocumentsSectionProps> = ({
  projectId,
  userRole,
  canUpload = true,
}) => {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [latestByType, setLatestByType] = useState<Partial<Record<DocumentType, DocumentDto>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('SRS');
  const [remarks, setRemarks] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Version history modal state
  const [historyModalType, setHistoryModalType] = useState<DocumentType | null>(null);
  const [versionHistory, setVersionHistory] = useState<DocumentDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Download spinner state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const data = await documentsApi.getForProject(projectId);
      setDocuments(data.documents || []);
      setLatestByType(data.latestByType || {});
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to retrieve project documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchDocuments();
    }
  }, [projectId]);

  const handleDownload = async (doc: DocumentDto) => {
    setDownloadingId(doc.id);
    try {
      await documentsApi.download(projectId, doc.id, doc.originalFileName || doc.fileName);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to download document.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenHistory = async (type: DocumentType) => {
    setHistoryModalType(type);
    setIsLoadingHistory(true);
    try {
      const versions = await documentsApi.getVersions(projectId, type);
      setVersionHistory(versions);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to retrieve version history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', selectedType);
      if (remarks.trim()) {
        formData.append('remarks', remarks.trim());
      }

      await documentsApi.upload(projectId, formData);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setRemarks('');
      await fetchDocuments();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to upload document deliverable.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-800" />
            <h3 className="text-sm font-bold text-slate-900">Project Deliverables & Document Repository</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional document artifacts, SRS revisions, architecture diagrams, and version history
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {userRole && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Role: {userRole}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            {documents.length} File{documents.length === 1 ? '' : 's'} Uploaded
          </span>
          {canUpload && (
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setSelectedFile(null);
                setRemarks('');
                setIsUploadModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Deliverable</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Loading document repository...
        </div>
      ) : (
        <div className="space-y-3">
          {/* Deliverables Grid by Document Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_TYPES.map((type) => {
              const meta = DOCUMENT_TYPE_LABELS[type];
              const latest = latestByType[type];

              return (
                <div
                  key={type}
                  className={`p-3.5 rounded-md border transition flex flex-col justify-between ${
                    latest
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-dashed border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-xs text-slate-900">{meta.title}</h4>
                          {latest ? (
                            <span className="px-1.5 py-0.2 bg-slate-900 text-white text-[10px] font-bold rounded-sm">
                              v{latest.version}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-sm border border-slate-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{meta.desc}</p>
                      </div>

                      {latest && (
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownload(latest)}
                            disabled={downloadingId === latest.id}
                            title="Download Current Version"
                            className="p-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-300 shadow-2xs transition disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(type)}
                            title="Inspect Version History"
                            className="p-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-300 shadow-2xs transition"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {latest ? (
                      <div className="bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium truncate max-w-[200px]" title={latest.originalFileName}>
                            {latest.originalFileName}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px]">{latest.fileSizeFormatted}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between">
                          <span>
                            By: <strong className="text-slate-700">{latest.uploadedBy.fullName}</strong> ({latest.uploadedBy.role})
                          </span>
                          <span>{latest.uploadedAt.substring(0, 10)}</span>
                        </div>
                        {latest.remarks && (
                          <div className="text-[10px] text-slate-600 italic border-t border-slate-200 pt-1 mt-1">
                            &ldquo;{latest.remarks}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 py-1">
                        No deliverable uploaded yet.
                      </div>
                    )}
                  </div>

                  {canUpload && !latest && (
                    <div className="pt-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType(type);
                          setSelectedFile(null);
                          setRemarks('');
                          setIsUploadModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-800 hover:text-slate-900"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Upload Initial Deliverable</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Deliverable Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Document Repository
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Upload Project Deliverable</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submissions are version-tracked and preserved with an institutional audit trail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-md hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deliverable Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white text-slate-900"
                >
                  {ALL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type].title} {latestByType[type] ? `(Next: v${(latestByType[type]?.version || 0) + 1})` : '(Initial v1)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File (Max 25MB: PDF, DOCX, PPTX, ZIP, PNG, JPG, MD)
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-1 text-[11px] text-slate-600 flex items-center space-x-1">
                    <Paperclip className="w-3 h-3 text-slate-400" />
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Revision Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Summarize key changes or additions in this version..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="inline-flex items-center space-x-1 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-xs transition disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Confirm Upload'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Audit Version History
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {DOCUMENT_TYPE_LABELS[historyModalType]?.title || historyModalType}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable revision logs and historical file attachments
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalType(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-md hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading version history...
              </div>
            ) : versionHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No historical versions recorded for this deliverable.
              </div>
            ) : (
              <div className="space-y-3">
                {versionHistory.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-md border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-bold rounded-sm text-[11px]">
                          v{v.version}
                        </span>
                        <span className="font-semibold text-slate-900">{v.originalFileName}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({v.fileSizeFormatted})</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Uploaded by <strong className="text-slate-800">{v.uploadedBy.fullName}</strong> ({v.uploadedBy.role}) on {v.uploadedAt.substring(0, 10)}
                      </div>
                      {v.remarks && (
                        <div className="text-[11px] text-slate-700 italic bg-white p-2 rounded-sm border border-slate-200 mt-1">
                          &ldquo;{v.remarks}&rdquo;
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(v)}
                      disabled={downloadingId === v.id}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold shadow-2xs transition shrink-0 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryModalType(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
