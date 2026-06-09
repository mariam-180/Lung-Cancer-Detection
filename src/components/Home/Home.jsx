import React, { useEffect, useState, useRef } from 'react'
import Style from './Home.module.css'
import { useAuth } from '../../Context/AuthContext'
import axios from 'axios'

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor'

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(val) {
  if (val == null) return '–%'
  return `${(val * 100).toFixed(1)}%`
}
function pctNum(val) {
  if (val == null) return 0
  return parseFloat((val * 100).toFixed(1))
}

// Normalize any string to a bare lowercase key with no spaces/underscores/hyphens
function normalize(str) {
  if (!str) return ''
  return String(str).toLowerCase().replace(/[\s_\-]/g, '')
}

// All known aliases that map to each canonical class key.
// Add more as the API returns different strings.
const CLASS_CONFIG = [
  {
    key: 'adenocarcinoma',
    label: 'Lung Adenocarcinoma',
    aliases: [
      'lungadenocarcinoma',
      'adenocarcinoma',
      'lung adenocarcinoma',
      'lungadenoca',
      'adeno',
    ],
  },
  {
    key: 'benign',
    label: 'Lung Benign',
    aliases: [
      'lungbenign',
      'benign',
      'lung benign',
      'normal',
      'lungbenigntissue',
    ],
  },
  {
    key: 'squamous',
    label: 'Lung Squamous Cell Carcinoma',
    aliases: [
      'lungsquamouscellcarcinoma',
      'squamouscellcarcinoma',
      'squamous',
      'scc',
      'lscc',
      'squamouscell',
      'lung squamous cell carcinoma',
      'squamous cell carcinoma',
      'largecellcarcinoma',
      'largecell',
    ],
  },
]

// Build a flat lookup: normalizedAlias → canonical key
const ALIAS_MAP = {}
CLASS_CONFIG.forEach(cls => {
  cls.aliases.forEach(alias => {
    ALIAS_MAP[normalize(alias)] = cls.key
  })
})

// Resolve any API string to a canonical key (falls back to the normalized string itself)
function resolveKey(raw) {
  if (!raw) return ''
  const n = normalize(raw)
  return ALIAS_MAP[n] ?? n
}

// Display label for whatever the API returns
function formatClassification(raw) {
  if (!raw) return '–'
  const key = resolveKey(raw)
  return CLASS_CONFIG.find(c => c.key === key)?.label ?? raw
}

// Build confidence items: winner gets the real score, others get 0%
function buildConfItems(result) {
  if (!result) {
    return CLASS_CONFIG.map(c => ({ label: c.label, value: null, isWinner: false }))
  }

  const winnerKey = resolveKey(result.classification)
  const score     = result.confidenceScore ?? null

  return CLASS_CONFIG.map(c => ({
    label:    c.label,
    value:    c.key === winnerKey ? score : (score != null ? 0 : null),
    isWinner: c.key === winnerKey,
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('upload')

  // ── Case state ────────────────────────────────────────────────────────────
  const [cases, setCases] = useState([])

  // ── Upload state ──────────────────────────────────────────────────────────
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [scanFile, setScanFile]             = useState(null)
  const [scanPreview, setScanPreview]       = useState(null)
  const [uploadLoading, setUploadLoading]   = useState(false)
  const [uploadError, setUploadError]       = useState('')
  const [uploadedScan, setUploadedScan]     = useState(null)

  // ── Analysis state ────────────────────────────────────────────────────────
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError]     = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)

  const analysisResultRef = useRef(null)
  const [fileInputKey, setFileInputKey]     = useState(0)
  const uploadedScanRef                     = useRef(null)
  const fileInputRef                        = useRef(null)

  useEffect(() => { uploadedScanRef.current = uploadedScan }, [uploadedScan])
  useEffect(() => { fetchCases() }, [token])

  // ── Refresh cases dropdown when a new case is created in Cases.jsx ────────
  useEffect(() => {
    const handler = () => fetchCases()
    window.addEventListener('caseCreated', handler)
    return () => window.removeEventListener('caseCreated', handler)
  }, [])

  async function fetchCases() {
    try {
      const res   = await axios.get(`${BASE_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { PageSize: 100 },
      })
      const data  = res.data?.data ?? res.data
      const items = Array.isArray(data) ? data : (data?.items ?? [])
      setCases(items)
    } catch (err) {
      console.error('[Home] fetchCases:', err)
    }
  }

  // ── Silently delete an uploaded-but-not-analyzed scan from the backend ────
  async function deleteOrphanScan(scan) {
    if (!scan?.id) return
    try {
      await axios.delete(`${BASE_URL}/scans/${scan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log('[Home] orphan scan deleted:', scan.id)
    } catch (err) {
      // Non-fatal — log and move on
      console.warn('[Home] could not delete orphan scan:', err)
    }
  }

  function resetScanPipeline() {
    setScanFile(null)
    setScanPreview(null)
    setUploadedScan(null)
    uploadedScanRef.current = null
    setAnalysisResult(null)
    analysisResultRef.current = null
    setUploadError('')
    setAnalyzeError('')
    setFileInputKey(k => k + 1)
  }

  function applyFile(file) {
    if (!file) return
    setAnalysisResult(null)
    analysisResultRef.current = null
    setUploadError('')
    setAnalyzeError('')
    setScanFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setScanPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setScanPreview(null)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    applyFile(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    applyFile(e.dataTransfer.files?.[0])
  }

  // ── Re-upload: delete the orphan scan first, then let user pick a new file ─
  async function handleReupload() {
    const orphan = uploadedScanRef.current

    // Clear state immediately so UI reacts
    setScanFile(null)
    setScanPreview(null)
    setUploadedScan(null)
    uploadedScanRef.current = null
    setAnalysisResult(null)
    analysisResultRef.current = null
    setUploadError('')
    setAnalyzeError('')
    setFileInputKey(k => k + 1)

    // Delete the orphan in the background (non-blocking)
    if (orphan?.id) deleteOrphanScan(orphan)

    setTimeout(() => { fileInputRef.current?.click() }, 50)
  }

  // ── Internal: upload scan file to backend ─────────────────────────────────
  async function uploadScan() {
    const formData = new FormData()
    formData.append('file', scanFile)
    const res = await axios.post(
      `${BASE_URL}/cases/${selectedCaseId}/scans`,
      formData,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
    )
    const scan = res.data?.data ?? res.data
    setUploadedScan(scan)
    uploadedScanRef.current = scan
    return scan
  }

  // ── "Run AI Analysis": upload then analyze in one flow ────────────────────
  async function handleAnalyze() {
    setUploadError('')
    setAnalyzeError('')

    if (!selectedCaseId) { setUploadError('Please select a case first.'); return }
    if (!scanFile)        { setUploadError('Please select a scan file.'); return }

    try {
      setAnalyzeLoading(true)

      // Step 1 — upload
      setUploadLoading(true)
      let scan
      try {
        scan = await uploadScan()
      } catch (err) {
        console.error('[Home] uploadScan:', err)
        setUploadError(err.response?.data?.message ?? 'Upload failed. Please try again.')
        return
      } finally {
        setUploadLoading(false)
      }

      // Step 2 — analyze
      const res = await axios.post(
        `${BASE_URL}/scans/${scan.id}/analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const result = res.data?.data ?? res.data
      console.log('[Home] analysisResult raw classification:', result?.classification)
      console.log('[Home] resolved key:', resolveKey(result?.classification))
      analysisResultRef.current = result
      setAnalysisResult(result)
      setActiveTab('analyze')
    } catch (err) {
      console.error('[Home] analyze:', err)
      setAnalyzeError(err.response?.data?.message ?? 'Analysis failed. Please try again.')
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const latestResult = analysisResult ?? analysisResultRef.current
  const confItems    = buildConfItems(latestResult)

  return (
    <section className={`${Style.homeSection} homesectioncomponent`}>
      <div className={Style.sectionContainer}>
        <div className={Style.HomeBody}>

          {/* ── LEFT: AI Panel ── */}
          <div className={Style.aiPanel}>
            <div className={Style.aiContent}>
              <div className={Style.aiIconWrap}>
                <i className="fa-solid fa-robot"></i>
                <span className={Style.aiPulse}></span>
              </div>
              <div className={Style.aiBadge}>
                <span className={Style.badgeDot}></span>
                AI-Powered Analysis
              </div>
              <h2 className={Style.aiTitle}>
                Smart Medical<br />
                <span className={Style.aiHighlight}>Scan Assistant</span>
              </h2>
              <p className={Style.aiDesc}>
                Upload your CT scan and let our AI instantly analyze, detect anomalies,
                and generate a detailed medical report in seconds.
              </p>
              <div className={Style.aiFeatures}>
                <div className={Style.featureItem}>
                  <div className={Style.featureIcon}>
                    <i className="fa-solid fa-magnifying-glass-chart"></i>
                  </div>
                  <div>
                    <p className={Style.featureTitle}>Instant Detection</p>
                    <p className={Style.featureSub}>Anomalies flagged in real-time</p>
                  </div>
                </div>
                <div className={Style.featureItem}>
                  <div className={Style.featureIcon}>
                    <i className="fa-solid fa-file-waveform"></i>
                  </div>
                  <div>
                    <p className={Style.featureTitle}>Reports</p>
                    <p className={Style.featureSub}>Detailed Reports generated instantly</p>
                  </div>
                </div>
                <div className={Style.featureItem}>
                  <div className={Style.featureIcon}>
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <p className={Style.featureSub}>Clinically validated model</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={Style.blob1}></div>
            <div className={Style.blob2}></div>
          </div>

          {/* ── RIGHT: Scan Panel ── */}
          <div className={Style.viewerPanel}>

            {/* Tabs */}
            <div className={Style.viewerTabs}>
              <button
                className={`${Style.tab} ${activeTab === 'upload'  ? Style.activeTab : ''}`}
                onClick={() => setActiveTab('upload')}>
                <i className="fa-solid fa-cloud-arrow-up"></i> Upload Scan
              </button>
              <button
                className={`${Style.tab} ${activeTab === 'analyze' ? Style.activeTab : ''}`}
                onClick={() => setActiveTab('analyze')}>
                <i className="fa-solid fa-brain"></i> AI Analysis
              </button>
            </div>

            {/* ══ UPLOAD TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'upload' && (
              <div className={Style.scanArea}>
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  id="scan-upload"
                  className={Style.hiddenFile}
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
                <div className={Style.uploadInner}>

                  {/* Case selector */}
                  <div className={Style.uploadCaseSelect}>
                    <label className={Style.uploadCaseLabel}>
                      <i className="fa-solid fa-folder-open"></i> Attach to Case
                    </label>
                    {cases.length === 0 ? (
                      <p className={Style.uploadCaseWarn}>
                        No cases yet — create one in the Cases section.
                      </p>
                    ) : (
                      <select
                        className={Style.uploadCaseDropdown}
                        value={selectedCaseId}
                        onChange={e => {
                          setSelectedCaseId(e.target.value)
                          resetScanPipeline()
                        }}
                      >
                        <option value="">— Choose a case —</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>
                            Case #{c.id}{c.description ? ` — ${c.description}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    className={Style.uploadPrompt}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => !scanFile && fileInputRef.current?.click()}
                  >
                    {scanPreview ? (
                      <div className={Style.previewWrap}>
                        <img src={scanPreview} alt="Scan preview" className={Style.previewImg} />
                        <div
                          className={Style.previewOverlay}
                          onClick={e => { e.stopPropagation(); handleReupload() }}
                        >
                          <i className="fa-solid fa-repeat"></i> Change file
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={Style.uploadIcon}>
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                        </div>
                        <p className={Style.uploadText}>
                          {scanFile ? scanFile.name : 'Drop CT scan here or click to upload'}
                        </p>
                        <p className={Style.uploadSub}>Supports DICOM · PNG · JPG · PDF</p>
                        <span className={Style.uploadBtn}>
                          <i className="fa-solid fa-folder-open"></i> Browse Files
                        </span>
                      </>
                    )}
                  </div>

                  {/* Status messages */}
                  {uploadError && (
                    <p className={Style.uploadMsg} style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i> {uploadError}
                    </p>
                  )}
                  {analyzeError && (
                    <p className={Style.uploadMsg} style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i> {analyzeError}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className={Style.uploadBtnRow}>
                    {scanFile && !analyzeLoading && (
                      <button
                        className={Style.reuploadActionBtn}
                        onClick={handleReupload}
                        disabled={analyzeLoading}
                      >
                        <i className="fa-solid fa-rotate"></i> Re-upload CT Scan
                      </button>
                    )}

                    <button
                      className={Style.analyzeActionBtn}
                      onClick={handleAnalyze}
                      disabled={analyzeLoading || uploadLoading || !scanFile || !selectedCaseId}
                    >
                      {(analyzeLoading || uploadLoading)
                        ? <><i className="fa-solid fa-spinner fa-spin"></i> {uploadLoading ? 'Uploading…' : 'Analyzing…'}</>
                        : <><i className="fa-solid fa-brain"></i> Run AI Analysis</>}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ══ AI ANALYSIS TAB ════════════════════════════════════════════ */}
            {activeTab === 'analyze' && (
              <div className={Style.tabContent}>
                <div className={Style.card}>
                  <div className={Style.cardTitle}>Diagnostic Report</div>
                  <div className={Style.results}>

                    <div className={Style.diagnosisBanner}>
                      <div className={Style.dxTag}>Prediction</div>
                      <div className={Style.dxName}>
                        {formatClassification(latestResult?.classification)}
                      </div>
                      <div className={Style.dxDesc}>
                        {latestResult
                          ? `Model EfficientNetB1 · processed in ${latestResult.processingTimeMs ?? '–'} ms`
                          : '–'}
                      </div>
                    </div>

                    {/* Confidence bars */}
                    <div className={Style.confList}>
                      {confItems.map(({ label, value, isWinner }) => (
                        <div key={label} className={Style.confItem}>
                          <div className={Style.confHeader}>
                            <span className={Style.confLabel}>{label}</span>
                            <span
                              className={Style.confPercent}
                              style={{ color: isWinner ? '#4f78c8' : '#94a3b8' }}
                            >
                              {pct(value)}
                            </span>
                          </div>
                          <div className={Style.confBarBg}>
                            <div
                              className={isWinner ? Style.confBarFill : Style.confBarFillDim}
                              style={{ width: `${pctNum(value)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={Style.infoGrid}>
                      <div className={Style.infoCell}>
                        <div className={Style.label}>Confidence</div>
                        <div className={Style.value}>
                          {latestResult?.confidenceScore != null
                            ? pct(latestResult.confidenceScore)
                            : '–'}
                        </div>
                      </div>
                      <div className={Style.infoCell}>
                        <div className={Style.label}>Status</div>
                        <div className={Style.value}>{latestResult ? 'Complete' : '–'}</div>
                      </div>
                    </div>

                    {!latestResult && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        <i className="fa-solid fa-brain" style={{ fontSize: '2rem', color: '#c7d7f0', display: 'block', marginBottom: 10 }}></i>
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>
                          No analysis yet. Upload a scan and click <strong>Run AI Analysis</strong>.
                        </p>
                        <button
                          className={Style.uploadBtn}
                          style={{ marginTop: 14, display: 'inline-flex', cursor: 'pointer' }}
                          onClick={() => setActiveTab('upload')}
                        >
                          <i className="fa-solid fa-cloud-arrow-up"></i> Go to Upload
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className={Style.disclaimer}>
                  <span>⚠️</span>
                  <span>
                    <strong>Research &amp; Testing Only.</strong> This tool is not a certified medical
                    device and is strictly for model validation. Results are probabilistic and
                    contain a margin of error; scans may be inaccurate or provide false
                    positives/negatives. Do not use these outputs for clinical diagnosis or patient
                    care. Always consult a licensed medical professional.
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  )
}