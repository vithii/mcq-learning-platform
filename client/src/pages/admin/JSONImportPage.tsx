import React, { useState } from 'react';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Repeat,
  ArrowRight,
  Download,
  Layers,
  RotateCcw
} from 'lucide-react';

export const JSONImportPage: React.FC = () => {
  const { addToast } = useToast();

  const [jsonText, setJsonText] = useState('');
  const [filename, setFilename] = useState('import.json');
  const [validating, setValidating] = useState(false);
  const [importing, setStartingImport] = useState(false);

  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update_existing' | 'skip_duplicate' | 'import_as_new'>('update_existing');
  const [importCompleted, setImportCompleted] = useState<any | null>(null);

  // Drag and drop handler
  const handleFileUpload = (file: File) => {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setJsonText(content);
      setPreviewResult(null);
      setImportCompleted(null);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (!jsonText.trim()) {
      addToast({ type: 'error', message: 'Please upload or paste JSON content' });
      return;
    }

    setValidating(true);
    setPreviewResult(null);
    setImportCompleted(null);

    try {
      const res = await ApiClient.validateImport(jsonText);
      setPreviewResult(res);
      if (res.isValid) {
        addToast({ type: 'success', message: 'JSON syntax & schema validated successfully!' });
      } else {
        addToast({ type: 'error', message: `Found ${res.invalidCount} validation issues in JSON` });
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || !previewResult.validatedRecords) return;

    setStartingImport(true);
    try {
      const res = await ApiClient.executeImport(filename, previewResult.validatedRecords, duplicateStrategy);
      setImportCompleted(res);
      addToast({ type: 'success', message: `Import successful! ${res.imported} new, ${res.updated} updated.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Import transaction failed' });
    } finally {
      setStartingImport(false);
    }
  };

  const downloadSampleJson = () => {
    const sample = {
      topics: [
        {
          id: "astronomy",
          name: "Astronomy",
          description: "Planetary science, astrophysics, and celestial bodies.",
          subtopics: [
            {
              id: "solar-system",
              name: "Solar System",
              description: "Sun, planets, and moons.",
              questions: [
                {
                  id: "astro-sol-001",
                  question: "Which planet in our solar system is known as the Red Planet?",
                  options: [
                    { key: "A", text: "Venus" },
                    { key: "B", text: "Mars" },
                    { key: "C", text: "Jupiter" },
                    { key: "D", text: "Mercury" }
                  ],
                  correct_answer: "B",
                  explanation: "Iron oxide (rust) on the Martian surface gives it a reddish appearance.",
                  difficulty: "easy"
                },
                {
                  id: "astro-sol-002",
                  question: "What is the largest planet in our solar system by mass and volume?",
                  options: [
                    { key: "A", text: "Saturn" },
                    { key: "B", text: "Neptune" },
                    { key: "C", text: "Jupiter" },
                    { key: "D", text: "Uranus" }
                  ],
                  correct_answer: "C",
                  explanation: "Jupiter has more than twice the mass of all other planets combined.",
                  difficulty: "easy"
                }
              ]
            }
          ]
        }
      ]
    };

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canonical_mcq_sample.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container" style={{ maxWidth: '860px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <FileCode size={24} style={{ color: 'var(--primary-light)' }} />
            <h1 style={{ fontSize: '1.85rem' }}>JSON Question Importer</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Upload, validate, preview, and atomically import structured question banks into the database.
          </p>
        </div>

        <button type="button" onClick={downloadSampleJson} className="btn btn-secondary btn-sm">
          <Download size={16} />
          <span>Download Sample Schema</span>
        </button>
      </div>

      {/* Step 1 & 2: Upload / Paste */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Step 1: Upload or Paste JSON</h2>

        {/* Drag & Drop Box */}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.02)',
            marginBottom: '1.25rem',
            textAlign: 'center'
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
        >
          <UploadCloud size={36} style={{ color: 'var(--primary-light)', marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: 600 }}>Click to browse or drag & drop JSON file</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Supports canonical JSON schema up to 15MB
          </div>
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
        </label>

        {/* Text Area for manual paste */}
        <div className="input-group">
          <label className="input-label" htmlFor="json-paste-area">Or Paste JSON Content Directly</label>
          <textarea
            id="json-paste-area"
            className="textarea"
            rows={8}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            placeholder='{ "topics": [ { "id": "...", "name": "...", "subtopics": [ ... ] } ] }'
            value={jsonText}
            onChange={e => {
              setJsonText(e.target.value);
              setPreviewResult(null);
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleValidate}
          className="btn btn-primary btn-block"
          disabled={validating || !jsonText.trim()}
        >
          <span>{validating ? 'Parsing & Validating Schema...' : 'Step 2: Validate Schema & Detect Duplicates'}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Step 3 & 4: Preview & Duplicate Detection */}
      {previewResult && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Import Preview & Verification</h2>
            <span className={`badge ${previewResult.isValid ? 'badge-success' : 'badge-danger'}`}>
              {previewResult.isValid ? '✓ Schema Valid' : '✕ Has Validation Errors'}
            </span>
          </div>

          {/* Counts Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>TOTAL QUESTIONS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{previewResult.totalQuestions}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--success)' }}>
              <div style={{ fontSize: '0.75rem' }}>NEW QUESTIONS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{previewResult.newCount}</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--warning)' }}>
              <div style={{ fontSize: '0.75rem' }}>DUPLICATES</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{previewResult.duplicateCount}</div>
            </div>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--danger)' }}>
              <div style={{ fontSize: '0.75rem' }}>INVALID RECORDS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{previewResult.invalidCount}</div>
            </div>
          </div>

          {/* Validation Errors List (if any) */}
          {previewResult.errors && previewResult.errors.length > 0 && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={18} />
                <span>Found {previewResult.errors.length} issue(s):</span>
              </div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {previewResult.errors.map((err: any, i: number) => (
                  <li key={i}>
                    {err.questionId && <strong>[ID: {err.questionId}] </strong>}
                    {err.problem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 5: Duplicate Resolution Strategy */}
          {previewResult.duplicateCount > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.925rem', marginBottom: '0.5rem' }}>
                Duplicate Resolution Strategy:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'update_existing', label: 'Update Existing Questions' },
                  { key: 'skip_duplicate', label: 'Skip Duplicates' },
                  { key: 'import_as_new', label: 'Import as New (Assign New IDs)' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`btn ${duplicateStrategy === opt.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setDuplicateStrategy(opt.key as any)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sample Questions Preview Table */}
          {previewResult.previewQuestions && previewResult.previewQuestions.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Sample Parsed Records Preview (First {previewResult.previewQuestions.length}):
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Question ID</th>
                      <th>Topic / Subtopic</th>
                      <th>Prompt</th>
                      <th>Options</th>
                      <th>Duplicate?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.previewQuestions.map((q: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{q.externalId}</td>
                        <td style={{ fontSize: '0.8rem' }}>{q.topicName} / {q.subtopicName}</td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.questionText}
                        </td>
                        <td>{q.optionCount} (Ans: {q.correctAnswer})</td>
                        <td>
                          {q.isDuplicate ? (
                            <span className="badge badge-warning">Duplicate ({q.duplicateMatchBy})</span>
                          ) : (
                            <span className="badge badge-success">New</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Commit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleExecuteImport}
              className="btn btn-primary btn-lg"
              disabled={importing || previewResult.invalidCount > 0}
            >
              <span>{importing ? 'Importing Transactionally...' : 'Commit Transactional Import'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Import Summary Report */}
      {importCompleted && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success-border)', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
            <div>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--success)' }}>Import Transaction Completed!</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Job ID: {importCompleted.jobId}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>TOTAL PROCESSED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{importCompleted.total}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>NEWLY IMPORTED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{importCompleted.imported}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>UPDATED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{importCompleted.updated}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SKIPPED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{importCompleted.skipped}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setJsonText('');
              setPreviewResult(null);
              setImportCompleted(null);
            }}
          >
            Import Another JSON Bank
          </button>
        </div>
      )}
    </div>
  );
};
