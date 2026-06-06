import React, { useEffect, useState, useRef } from 'react'
import Style from './Home.module.css'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor'

function pct(val) {
  if (val == null) return '–%'
  return `${(val * 100).toFixed(1)}%`
}
function pctNum(val) {
  if (val == null) return 0
  return parseFloat((val * 100).toFixed(1))
}


export default function Home() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('case')

  // ── New Case state ──────────────────────────────────────────────────────────
  const [cases, setCases]             = useState([])
  const [caseForm, setCaseForm]       = useState({ patientId: '', description: '', symptoms: '' })
  const [caseLoading, setCaseLoading] = useState(false)
  const [caseError, setCaseError]     = useState('')
  const [caseSuccess, setCaseSuccess] = useState('')
  const [createdCase, setCreatedCase] = useState(null)

  // ── Upload state ────────────────────────────────────────────────────────────
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [scanFile, setScanFile]             = useState(null)
  const [scanPreview, setScanPreview]       = useState(null)
  const [uploadLoading, setUploadLoading]   = useState(false)
  const [uploadError, setUploadError]       = useState('')
  const [uploadedScan, setUploadedScan]     = useState(null)
  const fileInputRef = useRef(null)

  // ── Analysis state ──────────────────────────────────────────────────────────
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [analyzeError, setAnalyzeError]     = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => { fetchCases() }, [token])

  async function fetchCases() {
    try {
      const res   = await axios.get(`${BASE_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { PageSize: 100 },
      })
      const data  = res.data?.data ?? res.data
      const items = Array.isArray(data) ? data : data?.items ?? []
      setCases(items)
    } catch (err) {
      console.error('[Home] fetchCases:', err)
    }
  }

  // ── Create Case ─────────────────────────────────────────────────────────────
  async function handleCreateCase() {
    setCaseError('')
    setCaseSuccess('')
    if (!caseForm.patientId) { setCaseError('Patient ID is required.'); return }
    try {
      setCaseLoading(true)
      const res = await axios.post(`${BASE_URL}/cases`, {
        patientId:   parseInt(caseForm.patientId, 10),
        description: caseForm.description,
        symptoms:    caseForm.symptoms,
      }, { headers: { Authorization: `Bearer ${token}` } })

      const created = res.data?.data ?? res.data
      setCreatedCase(created)
      setCaseSuccess(`Case #${created?.id ?? ''} created successfully!`)
      setCaseForm({ patientId: '', description: '', symptoms: '' })
      await fetchCases()
      if (created?.id) setSelectedCaseId(String(created.id))

      // ── Notify Cases component to refetch ──────────────────────────────────
      window.dispatchEvent(new CustomEvent('case-created'))

    } catch (err) {
      console.error('[Home] createCase:', err)
      setCaseError(err.response?.data?.message ?? 'Failed to create case. Please try again.')
    } finally {
      setCaseLoading(false)
    }
  }

  // ── File selection ──────────────────────────────────────────────────────────
  function applyFile(file) {
    if (!file) return
    setScanFile(file)
    setUploadedScan(null)
    setAnalysisResult(null)
    setUploadError('')
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setScanPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setScanPreview(null)
    }
  }

  function handleFileChange(e) { applyFile(e.target.files?.[0]) }

  function handleDrop(e) {
    e.preventDefault()
    applyFile(e.dataTransfer.files?.[0])
  }

  // ── Upload Scan ─────────────────────────────────────────────────────────────
  async function handleUploadScan() {
    setUploadError('')
    if (!selectedCaseId) { setUploadError('Please select a case first.'); return }
    if (!scanFile)        { setUploadError('Please select a scan file.'); return }
    try {
      setUploadLoading(true)
      const formData = new FormData()
      formData.append('file', scanFile)
      const res = await axios.post(
        `${BASE_URL}/cases/${selectedCaseId}/scans`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      )
      setUploadedScan(res.data?.data ?? res.data)
    } catch (err) {
      console.error('[Home] uploadScan:', err)
      setUploadError(err.response?.data?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploadLoading(false)
    }
  }

  // ── Analyze ─────────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!uploadedScan?.id) { setAnalyzeError('Upload a scan first.'); return }
    setAnalyzeError('')
    setAnalysisResult(null)
    try {
      setAnalyzeLoading(true)
      const res = await axios.post(
        `${BASE_URL}/scans/${uploadedScan.id}/analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setAnalysisResult(res.data?.data ?? res.data)
      setActiveTab('analyze')
    } catch (err) {
      console.error('[Home] analyze:', err)
      setAnalyzeError(err.response?.data?.message ?? 'Analysis failed. Please try again.')
    } finally {
      setAnalyzeLoading(false)
    }
  }

  const confItems = [
    { label: 'Lung Adenocarcinoma',          value: analysisResult?.adenocarcinomaConfidence ?? analysisResult?.lungAdenocarcinoma ?? null },
    { label: 'Lung Benign',                  value: analysisResult?.benignConfidence          ?? analysisResult?.lungBenign          ?? null },
    { label: 'Lung Squamous Cell Carcinoma', value: analysisResult?.squamousConfidence        ?? analysisResult?.lungSquamous        ?? null },
  ]

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
                    <p className={Style.featureTitle}> Reports</p>
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
                className={`${Style.tab} ${activeTab === 'upload' ? Style.activeTab : ''}`}
                onClick={() => setActiveTab('upload')}>
                <i className="fa-solid fa-cloud-arrow-up"></i> Upload Scan
              </button>
              <button
                className={`${Style.tab} ${activeTab === 'analyze' ? Style.activeTab : ''}`}
                onClick={() => setActiveTab('analyze')}>
                <i className="fa-solid fa-brain"></i> AI Analysis
              </button>
              <button
                className={`${Style.tab} ${activeTab === 'case' ? Style.activeTab : ''}`}
                onClick={() => setActiveTab('case')}>
                <i className="fa-solid fa-folder-plus"></i> New Case
              </button>
            </div>

            {/* ══ UPLOAD TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'upload' && (
              <div className={Style.scanArea}>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="scan-upload"
                  className={Style.hiddenFile}
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />

                <div className={Style.uploadInner}>

                  <div className={Style.uploadCaseSelect}>
                    <label className={Style.uploadCaseLabel}>
                      <i className="fa-solid fa-folder-open"></i> Attach to Case
                    </label>
                    {cases.length === 0 ? (
                      <p className={Style.uploadCaseWarn}>
                        No cases yet.{' '}
                        <button className={Style.uploadCaseLink} onClick={() => setActiveTab('case')}>
                          Create one →
                        </button>
                      </p>
                    ) : (
                      <select
                        className={Style.uploadCaseDropdown}
                        value={selectedCaseId}
                        onChange={e => { setSelectedCaseId(e.target.value); setUploadedScan(null); setAnalysisResult(null) }}
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

                  <div
                    className={Style.uploadPrompt}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {scanPreview ? (
                      <div className={Style.previewWrap}>
                        <img src={scanPreview} alt="Scan preview" className={Style.previewImg} />
                        <div className={Style.previewOverlay}>
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

                  {uploadError && (
                    <p className={Style.uploadMsg} style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i> {uploadError}
                    </p>
                  )}
                  {uploadedScan && (
                    <p className={Style.uploadMsg} style={{ color: '#16a34a' }}>
                      <i className="fa-solid fa-circle-check"></i> Scan uploaded — ID #{uploadedScan.id}
                    </p>
                  )}
                  {analyzeError && (
                    <p className={Style.uploadMsg} style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i> {analyzeError}
                    </p>
                  )}

                  <div className={Style.uploadBtnRow}>
                    <button
                      className={Style.uploadActionBtn}
                      onClick={handleUploadScan}
                      disabled={uploadLoading || !scanFile || !selectedCaseId}
                    >
                      {uploadLoading
                        ? <><i className="fa-solid fa-spinner fa-spin"></i> Uploading…</>
                        : <><i className="fa-solid fa-cloud-arrow-up"></i> Upload Scan</>}
                    </button>

                    {uploadedScan && (
                      <button
                        className={Style.analyzeActionBtn}
                        onClick={handleAnalyze}
                        disabled={analyzeLoading}
                      >
                        {analyzeLoading
                          ? <><i className="fa-solid fa-spinner fa-spin"></i> Analyzing…</>
                          : <><i className="fa-solid fa-brain"></i> Run AI Analysis</>}
                      </button>
                    )}
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
                        {analysisResult?.prediction ?? analysisResult?.diagnosis ?? '–'}
                      </div>
                      <div className={Style.dxDesc}>
                        {analysisResult?.description ?? analysisResult?.summary ?? '–'}
                      </div>
                    </div>

                    <div className={Style.confList}>
                      {confItems.map(({ label, value }) => (
                        <div key={label} className={Style.confItem}>
                          <div className={Style.confHeader}>
                            <span className={Style.confLabel}>{label}</span>
                            <span className={Style.confPercent}>{pct(value)}</span>
                          </div>
                          <div className={Style.confBarBg}>
                            <div className={Style.confBarFill} style={{ width: `${pctNum(value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={Style.infoGrid}>
                      <div className={Style.infoCell}>
                        <div className={Style.label}>Confidence</div>
                        <div className={Style.value}>
                          {analysisResult?.confidence != null ? pct(analysisResult.confidence) : '–'}
                        </div>
                      </div>
                      <div className={Style.infoCell}>
                        <div className={Style.label}>Status</div>
                        <div className={Style.value}>{analysisResult ? 'Complete' : '–'}</div>
                      </div>
                      <div className={Style.infoCell}>
                        <div className={Style.label}>Model</div>
                        <div className={Style.value}>ResNet50</div>
                      </div>
                      <div className={Style.infoCell}>
                        <div className={Style.label}>Classes</div>
                        <div className={Style.value}>3</div>
                      </div>
                    </div>

                    {!analysisResult && (
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
                    <strong>Research & Testing Only.</strong> This tool is not a certified medical
                    device and is strictly for model validation. Results are probabilistic and
                    contain a margin of error; scans may be inaccurate or provide false
                    positives/negatives. Do not use these outputs for clinical diagnosis or patient
                    care. Always consult a licensed medical professional.
                  </span>
                </div>
              </div>
            )}

            {/* ══ NEW CASE TAB ═══════════════════════════════════════════════ */}
            {activeTab === 'case' && (
              <div className={Style.tabContent}>
                <div className={Style.caseCard}>
                  <div className={Style.caseCardHeader}>
                    <div className={Style.caseCardIcon}>
                      <i className="fa-solid fa-folder-plus"></i>
                    </div>
                    <div>
                      <h3 className={Style.caseCardTitle}>Create New Case</h3>
                      <p className={Style.caseCardSub}>Register a new patient case</p>
                    </div>
                  </div>

                  {caseError && (
                    <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0 0 4px', fontWeight: 600 }}>
                      <i className="fa-solid fa-circle-exclamation"></i> {caseError}
                    </p>
                  )}
                  {caseSuccess && (
                    <p style={{ color: '#16a34a', fontSize: '0.82rem', margin: '0 0 4px', fontWeight: 600 }}>
                      <i className="fa-solid fa-circle-check"></i> {caseSuccess}
                    </p>
                  )}

                  <div className={Style.formGrid}>
                    <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                      <label className={Style.formLabel}>
                        <i className="fa-solid fa-id-card"></i> Patient ID
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1"
                        className={Style.formInput}
                        value={caseForm.patientId}
                        onChange={e => setCaseForm(f => ({ ...f, patientId: e.target.value }))}
                      />
                    </div>

                    <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                      <label className={Style.formLabel}>
                        <i className="fa-solid fa-notes-medical"></i> Description
                      </label>
                      <input
                        type="text"
                        placeholder="Case description…"
                        className={Style.formInput}
                        value={caseForm.description}
                        onChange={e => setCaseForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                      <label className={Style.formLabel}>
                        <i className="fa-solid fa-stethoscope"></i> Symptoms
                      </label>
                      <textarea
                        placeholder="Enter patient symptoms…"
                        className={`${Style.formInput} ${Style.formTextarea}`}
                        value={caseForm.symptoms}
                        onChange={e => setCaseForm(f => ({ ...f, symptoms: e.target.value }))}
                      />
                    </div>
                  </div>

                  <button
                    className={Style.actionBtn}
                    onClick={handleCreateCase}
                    disabled={caseLoading}
                  >
                    {caseLoading
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Creating…</>
                      : <><i className="fa-solid fa-plus"></i> Create Case</>}
                  </button>

                  {createdCase && (
                    <button
                      className={Style.actionBtn}
                      style={{ marginTop: 8, background: 'white', color: '#4f78c8', border: '1px solid #4f78c8', boxShadow: 'none' }}
                      onClick={() => setActiveTab('upload')}
                    >
                      <i className="fa-solid fa-arrow-right"></i> Continue to Upload Scan
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  )
}