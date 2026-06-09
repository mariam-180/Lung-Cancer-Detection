


// Cases.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Style from './Cases.module.css'
import { useAuth } from '../../Context/AuthContext'
import axios from 'axios'

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor'
const POLL_INTERVAL_MS = 1000 // live-update every 1 second

function formatTime12h(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z')
  if (isNaN(date)) return 'N/A'
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Cairo',
  })
}

function formatTimeOnly(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z')
  if (isNaN(date)) return 'N/A'
  return date.toLocaleString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Cairo',
  })
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const cfg = {
    success: {
      bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)',
      border: '#6ee7b7', iconBg: '#10b981',
      title: 'Success!', text: '#065f46',
      icon: 'fa-circle-check',
    },
    error: {
      bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)',
      border: '#fca5a5', iconBg: '#ef4444',
      title: 'Error', text: '#991b1b',
      icon: 'fa-circle-exclamation',
    },
  }[type]

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(-20px) scale(0.95); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes progress {
          from { width:100%; }
          to   { width:0%;   }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 99999,
        width: 'min(340px, calc(100vw - 40px))', borderRadius: '16px',
        background: cfg.bg, border: `1.5px solid ${cfg.border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: cfg.iconBg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${cfg.iconBg}55`,
          }}>
            <i className={`fa-solid ${cfg.icon}`} style={{ color: '#fff', fontSize: '18px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: cfg.text }}>{cfg.title}</p>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: cfg.text, opacity: 0.85, lineHeight: 1.4 }}>{message}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: cfg.text, opacity: 0.5, fontSize: '16px',
            padding: '0', lineHeight: 1, flexShrink: 0, transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div style={{ height: '3px', background: 'rgba(0,0,0,0.06)' }}>
          <div style={{
            height: '100%', background: cfg.iconBg, borderRadius: '0 0 2px 2px',
            animation: 'progress 4s linear forwards',
          }} />
        </div>
      </div>
    </>
  )
}

// ── Live indicator dot shown while polling ────────────────────────────────────
function LiveBadge() {
  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1);   }
          50%       { opacity: 0.5; transform: scale(1.5); }
        }
      `}</style>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '3px 10px', borderRadius: '20px',
        background: '#ecfdf5', border: '1px solid #6ee7b7',
        fontSize: '11px', fontWeight: '700', color: '#059669',
        letterSpacing: '0.3px',
      }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#10b981',
          animation: 'livePulse 1.4s ease-in-out infinite',
          display: 'inline-block',
        }} />
        LIVE
      </div>
    </>
  )
}

export default function Cases() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('list')
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  const pageSize = 6
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCase, setSelectedCase] = useState(null)
  const [form, setForm] = useState({ patientId: '', description: '', symptoms: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  // ── Polling ref — holds the interval ID so we can clear it ───────────────
  const pollRef = useRef(null)
  const selectedCaseIdRef = useRef(null)

  function showToast(message, type = 'success') { setToast({ message, type }) }

  // ── Browser back/forward navigation ──────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'detail') {
      window.history.pushState({ casesTab: 'detail' }, '')
    }
  }, [activeTab])

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab('list')
      setSelectedCase(null)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Silent refresh of the currently open case (used by poll + events) ─────
  const refreshSelectedCase = useCallback(async (caseId) => {
    if (!caseId) return
    try {
      const res = await axios.get(`${BASE_URL}/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSelectedCase(res.data.data)
    } catch { /* silent — don't disrupt the UI on a background poll failure */ }
  }, [token])

  // ── Start / stop live polling when the detail tab opens or closes ─────────
  useEffect(() => {
    if (activeTab === 'detail' && selectedCase?.id) {
      selectedCaseIdRef.current = selectedCase.id

      // Kick off polling
      pollRef.current = setInterval(() => {
        refreshSelectedCase(selectedCaseIdRef.current)
      }, POLL_INTERVAL_MS)
    } else {
      // Clear polling when not on the detail tab
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [activeTab, selectedCase?.id, refreshSelectedCase])

  // Keep the ref in sync if selectedCase changes (e.g. user navigates between cases)
  useEffect(() => {
    selectedCaseIdRef.current = selectedCase?.id ?? null
  }, [selectedCase?.id])

  // ── Event-driven refresh (report created / updated / finalized / sent) ────
  useEffect(() => {
    const handleRefreshByCase = (e) => {
      const patientCaseId = e?.detail?.patientCaseId
      if (selectedCase && (patientCaseId === selectedCase.id || !patientCaseId)) {
        refreshSelectedCase(selectedCase.id)
      }
    }

    const handleRefreshByReport = () => {
      if (selectedCase) refreshSelectedCase(selectedCase.id)
    }

    window.addEventListener('reportCreated',   handleRefreshByCase)
    window.addEventListener('reportUpdated',   handleRefreshByCase)
    window.addEventListener('reportFinalized', handleRefreshByReport)
    window.addEventListener('reportSent',      handleRefreshByReport)

    return () => {
      window.removeEventListener('reportCreated',   handleRefreshByCase)
      window.removeEventListener('reportUpdated',   handleRefreshByCase)
      window.removeEventListener('reportFinalized', handleRefreshByReport)
      window.removeEventListener('reportSent',      handleRefreshByReport)
    }
  }, [selectedCase, refreshSelectedCase])

  useEffect(() => { fetchCases() }, [pageNumber, searchTerm])

  async function fetchCases() {
    try {
      setLoading(true); setError('')
      const res = await axios.get(`${BASE_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          PageNumber: pageNumber,
          PageSize: pageSize,
          SearchTerm: searchTerm,
          SortBy: 'patientId',
          IsDescending: false,
        },
      })
      const data = res.data.data
      setCases(data?.items || [])
      setTotalPages(data?.totalPages || 0)
      setTotalCount(data?.totalCount || 0)
      setHasNextPage(data?.hasNextPage || false)
      setHasPreviousPage(data?.hasPreviousPage || false)
    } catch { setError('Failed to load cases.') }
    finally { setLoading(false) }
  }

  async function handleViewDetail(caseItem) {
    try {
      setLoading(true)
      const res = await axios.get(`${BASE_URL}/cases/${caseItem.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSelectedCase(res.data.data)
      setActiveTab('detail')
    } catch { showToast('Failed to load case detail.', 'error') }
    finally { setLoading(false) }
  }

  async function handleCreateCase() {
    try {
      setFormLoading(true); setFormError('')
      if (!form.patientId || !form.description || !form.symptoms) {
        setFormError('All fields are required.'); return
      }
      await axios.post(
        `${BASE_URL}/cases`,
        {
          patientId: Number(form.patientId),
          description: form.description,
          symptoms: form.symptoms,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showToast('Case created successfully!', 'success')
      window.dispatchEvent(new CustomEvent('caseCreated'))
      setForm({ patientId: '', description: '', symptoms: '' })
      fetchCases()
      setTimeout(() => setActiveTab('list'), 1200)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save case.'
      setFormError(msg); showToast(msg, 'error')
    } finally { setFormLoading(false) }
  }

  function getInitial(name) { return name ? name.charAt(0).toUpperCase() : '?' }

  function getAIClassificationFromScan(scan) {
    const raw = (
      scan.aiClassification ??
      scan.classification   ??
      scan.predictedClass   ??
      scan.aiResult         ??
      scan.aiPrediction     ??
      null
    )
    if (!raw) return null
    if (typeof raw === 'object' && raw !== null) {
      return raw.classification ?? raw.predictedClass ?? raw.aiLabel ?? null
    }
    return raw
  }

  function handleWriteReportForScan(scan) {
    const aiClassification = getAIClassificationFromScan(scan)

    localStorage.setItem('prefill_report', JSON.stringify({
      patientCaseId: selectedCase.id,
      ctScanId: scan.id,
      aiClassification,
      fromCTScan: true,
    }))

    window.dispatchEvent(new CustomEvent('openReportForm'))

    setTimeout(() => {
      document.querySelector('.reportsection')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  function handleWriteReportForCase() {
    localStorage.setItem('prefill_report', JSON.stringify({
      patientCaseId: selectedCase.id,
      ctScanId: null,
      aiClassification: null,
      fromCTScan: false,
    }))

    window.dispatchEvent(new CustomEvent('openReportForm'))

    setTimeout(() => {
      document.querySelector('.reportsection')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  return (
    <div className={Style.casesWrapper}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className={Style.maindiv}>

        <style>{`
          @keyframes shimmer {
            0%   { background-position:  200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (max-width: 640px) {
            .cases-col-desc, .cases-col-created { display: none !important; }
          }
          @media (max-width: 480px) {
            .cases-col-pid { display: none !important; }
          }
          @media (max-width: 768px) {
            .detail-grid-responsive { grid-template-columns: 1fr !important; }
          }
          @media (max-width: 480px) {
            .pagination-wrap { flex-wrap: wrap; gap: 5px !important; justify-content: center; }
          }
          @media (max-width: 600px) {
            .form-grid-responsive { grid-template-columns: 1fr !important; }
            .form-full-width-responsive { grid-column: 1 !important; }
          }
        `}</style>

        {/* ── TABS ── */}
        <div className={Style.tabs}>
          <button
            className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <i className="fa-solid fa-list" /> <span>Cases List</span>
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'new' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <i className="fa-solid fa-folder-plus" /> <span>New Case</span>
          </button>
        </div>

        {/* ── LIST ── */}
        {activeTab === 'list' && (
          <>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Patient Cases</h2>
                <p className={Style.subtitle}>
                  {loading ? 'Loading...' : `${totalCount} records found`}
                </p>
              </div>
            </div>

            <div className={Style.filterBar}>
              <div className={Style.searchWrap}>
                <i className={`fa-solid fa-magnifying-glass ${Style.searchIcon}`} />
                <input
                  type="text"
                  placeholder="Search patient..."
                  className={Style.searchInput}
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPageNumber(1) }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column',
              minHeight: '300px', maxHeight: '480px',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              overflow: 'hidden', background: '#fff',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                <table className={Style.table} style={{ width: '100%', minWidth: '400px' }}>
                  <thead>
                    <tr className={Style.theadRow}>
                      <th className={`${Style.th} cases-col-pid`}>Patient ID</th>
                      <th className={Style.th}>Patient Name</th>
                      <th className={`${Style.th} cases-col-desc`}>Description</th>
                      <th className={`${Style.th} cases-col-created`}>Created At</th>
                      <th className={Style.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className={Style.tr}>
                          {[44, 160, 130, 72, 44].map((w, j) => (
                            <td key={j} className={Style.td}>
                              <div style={{
                                height: '13px', width: `${w}px`, maxWidth: '100%',
                                borderRadius: '6px',
                                background: 'linear-gradient(90deg,#f0f4f8 25%,#dde3ea 50%,#f0f4f8 75%)',
                                backgroundSize: '200% 100%',
                                animation: `shimmer 1.4s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`,
                              }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : error ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
                          <i className="fa-solid fa-circle-exclamation"
                            style={{ fontSize: '28px', display: 'block', marginBottom: '10px' }} />
                          {error}
                        </td>
                      </tr>
                    ) : cases.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                          No cases found.
                        </td>
                      </tr>
                    ) : (
                      [...cases].sort((a, b) => a.patientId - b.patientId).map(c => (
                        <tr key={c.id} className={Style.tr}>
                          <td className={`${Style.td} cases-col-pid`}>{c.patientId}</td>
                          <td className={Style.td}>
                            <div className={Style.nameCell}>
                              <div className={Style.avatar}>{getInitial(c.patientName)}</div>
                              <span>{c.patientName || 'N/A'}</span>
                            </div>
                          </td>
                          <td className={`${Style.td} cases-col-desc`}>{c.description || 'N/A'}</td>
                          <td className={`${Style.td} cases-col-created`}>{formatTimeOnly(c.createdAt)}</td>
                          <td className={Style.td}>
                            <button className={Style.actionBtn} onClick={() => handleViewDetail(c)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination-wrap" style={{
                flexShrink: 0, display: 'flex', justifyContent: 'center',
                alignItems: 'center', gap: '7px', padding: '10px 0',
                borderTop: '1px solid #e2e8f0', background: '#fafbfc',
              }}>
                <button
                  onClick={() => setPageNumber(p => p - 1)}
                  disabled={!hasPreviousPage}
                  style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    border: '1px solid #e2e8f0', background: '#fff',
                    cursor: !hasPreviousPage ? 'not-allowed' : 'pointer',
                    opacity: !hasPreviousPage ? 0.35 : 1, fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#64748b',
                  }}
                >‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setPageNumber(page)} style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    border: page === pageNumber ? 'none' : '1px solid #e2e8f0',
                    background: page === pageNumber
                      ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
                    color: page === pageNumber ? '#fff' : '#475569',
                    fontWeight: page === pageNumber ? '700' : '500',
                    fontSize: '13px', cursor: 'pointer',
                    boxShadow: page === pageNumber
                      ? '0 4px 12px rgba(37,99,235,0.32)' : 'none',
                  }}>{page}</button>
                ))}

                <button
                  onClick={() => setPageNumber(p => p + 1)}
                  disabled={!hasNextPage}
                  style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    border: '1px solid #e2e8f0', background: '#fff',
                    cursor: !hasNextPage ? 'not-allowed' : 'pointer',
                    opacity: !hasNextPage ? 0.35 : 1, fontSize: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#64748b',
                  }}
                >›</button>
              </div>
            </div>
          </>
        )}

        {/* ── NEW CASE ── */}
        {activeTab === 'new' && (
          <div className={Style.formSection}>
            <div className={Style.formCard}>
              <div className={Style.formCardHeader}>
                <div className={Style.formCardIcon}><i className="fa-solid fa-folder-plus" /></div>
                <div>
                  <h3 className={Style.formCardTitle}>Create New Case</h3>
                  <p className={Style.formCardSub}>Register patient case</p>
                </div>
              </div>
              <div className={`${Style.formGrid} form-grid-responsive`}>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Patient ID</label>
                  <input
                    type="number" name="patientId" value={form.patientId}
                    onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={Style.formInput} placeholder="Enter patient ID"
                  />
                </div>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Description</label>
                  <input
                    type="text" name="description" value={form.description}
                    onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={Style.formInput} placeholder="Enter description"
                  />
                </div>
                <div className={`${Style.formGroup} ${Style.fullWidth} form-full-width-responsive`}>
                  <label className={Style.formLabel}>Symptoms</label>
                  <textarea
                    name="symptoms" value={form.symptoms}
                    onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextarea}`}
                    placeholder="Enter symptoms"
                  />
                </div>
              </div>
              {formError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#b91c1c', fontSize: '13px', marginTop: '8px',
                }}>
                  <i className="fa-solid fa-circle-exclamation" /> {formError}
                </div>
              )}
              <div className={Style.formActions}>
                <button className={Style.cancelBtn} onClick={() => setActiveTab('list')}>
                  Cancel
                </button>
                <button
                  className={Style.submitBtn}
                  disabled={formLoading}
                  onClick={handleCreateCase}
                >
                  {formLoading
                    ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />Creating...</>
                    : 'Create Case'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL ── */}
        {activeTab === 'detail' && (
          <div className={Style.detailSection}>
            <button
              className={Style.backBtn}
              onClick={() => {
                setActiveTab('list')
                setSelectedCase(null)
                if (window.history.state?.casesTab === 'detail') {
                  window.history.back()
                }
              }}
            >
              <i className="fa-solid fa-arrow-left" /> Back to Cases
            </button>

            {!selectedCase ? <p>No case selected.</p> : (
              <>
                {/* Header row */}
                <div style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                        Patient Case
                      </h2>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                        {selectedCase.patientName}
                      </p>
                    </div>
                    {/* Live badge — visible only while on detail tab */}
                    <LiveBadge />
                  </div>

                  <button
                    onClick={handleWriteReportForCase}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 18px', borderRadius: '10px',
                      background: 'linear-gradient(135deg,#10b981,#059669)',
                      border: 'none', color: '#fff',
                      fontSize: '13px', fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <i className="fa-solid fa-file-pen" />
                    Write Report on This Case
                  </button>
                </div>

                <div
                  className="detail-grid-responsive"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* PATIENT INFO */}
                  <div className={Style.detailCard}>
                    <div className={Style.detailCardHeader}>
                      <div className={Style.detailIcon}><i className="fa-solid fa-user" /></div>
                      <h3 className={Style.detailCardTitle}>Patient Info</h3>
                    </div>
                    <div className={Style.detailRows}>
                      {[
                        { label: 'Case ID', value: selectedCase.id },
                        { label: 'Case Number', value: selectedCase.caseNumber },
                        { label: 'Patient Name', value: selectedCase.patientName },
                        { label: 'Patient ID', value: selectedCase.patientId },
                        { label: 'Doctor', value: selectedCase.doctorName },
                        { label: 'Description', value: selectedCase.description },
                        { label: 'Symptoms', value: selectedCase.symptoms },
                        { label: 'Created At', value: formatTime12h(selectedCase.createdAt) },
                        { label: 'Total Scans', value: selectedCase.totalScans ?? 0 },
                        { label: 'Total Reports', value: selectedCase.totalReports ?? 0 },
                      ].map(({ label, value }) => (
                        <div className={Style.detailRow} key={label}>
                          <span className={Style.detailLabel}>{label}</span>
                          <span className={Style.detailValue}>{value ?? 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CT SCANS */}
                  <div className={Style.detailCard}>
                    <div className={Style.detailCardHeader}>
                      <div className={Style.detailIcon}><i className="fa-solid fa-x-ray" /></div>
                      <h3 className={Style.detailCardTitle}>CT Scans</h3>
                    </div>
                    <div className={Style.scanList}>
                      {selectedCase.ctScans?.length > 0
                        ? selectedCase.ctScans.map((scan, i) => {
                            const aiClass = getAIClassificationFromScan(scan)

                            return (
                              <div key={i} style={{
                                padding: '10px 0',
                                borderBottom: i < selectedCase.ctScans.length - 1
                                  ? '1px solid #f0f4f8' : 'none',
                              }}>
                                {/* Image */}
                                <div style={{
                                  position: 'relative', borderRadius: '8px',
                                  overflow: 'hidden', marginBottom: '8px',
                                }}>
                                  <img
                                    src={`https://lungcancer.runasp.net${scan.imageUrl}`}
                                    alt={scan.originalFileName || 'CT Scan'}
                                    style={{
                                      width: '100%', height: '160px',
                                      objectFit: 'cover', display: 'block', background: '#000',
                                    }}
                                    onError={e => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                  />
                                  <div style={{
                                    display: 'none', alignItems: 'center',
                                    justifyContent: 'center', height: '80px',
                                    background: '#f3f4f6', color: '#9ca3af',
                                    fontSize: '13px', gap: '6px',
                                  }}>
                                    <i className="fa-solid fa-image-slash" /> Image unavailable
                                  </div>
                                </div>

                                {/* Scan info + Write Report button */}
                                <div style={{
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap',
                                }}>
                                  <div style={{ minWidth: 0 }}>
                                    <p style={{
                                      margin: 0, fontSize: '12px', fontWeight: '600',
                                      color: '#374151', whiteSpace: 'nowrap',
                                      overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                      {scan.originalFileName || `Scan #${i + 1}`}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                                      #{scan.id} · {scan.fileType}
                                      · {(scan.fileSize / 1024).toFixed(1)} KB
                                      · {formatTimeOnly(scan.scanDate)}
                                    </p>
                                    {aiClass != null && (
                                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>
                                        <i className="fa-solid fa-robot" style={{ marginRight: 4 }} />
                                        AI: {aiClass}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleWriteReportForScan(scan)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '6px',
                                      padding: '7px 12px', borderRadius: '8px',
                                      background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                                      border: 'none', color: '#fff',
                                      fontSize: '11px', fontWeight: '700',
                                      cursor: 'pointer', flexShrink: 0,
                                      boxShadow: '0 3px 10px rgba(37,99,235,0.3)',
                                      transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                  >
                                    <i className="fa-solid fa-file-pen" style={{ fontSize: '10px' }} />
                                    Write Report
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        : <p style={{ color: '#94a3b8', fontSize: '13px' }}>No CT scans available.</p>
                      }
                    </div>
                  </div>

                  {/* REPORTS */}
                  <div className={Style.detailCard}>
                    <div className={Style.detailCardHeader}>
                      <div className={Style.detailIcon}><i className="fa-solid fa-file-waveform" /></div>
                      <h3 className={Style.detailCardTitle}>Reports</h3>
                    </div>
                    <div className={Style.scanList}>
                      {selectedCase.reports?.length > 0 ? (
                        <>
                          <p style={{
                            fontSize: '11px', fontWeight: '600', color: '#94a3b8',
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                          }}>
                            Existing Reports
                          </p>
                          {selectedCase.reports.map((report, i) => (
                            <div key={i} className={Style.reportCard}>
                              <div className={Style.reportHeader}>
                                <div className={Style.reportIcon}>
                                  <i className="fa-solid fa-file-medical" />
                                </div>
                                <div>
                                  <p className={Style.reportNumber}>Report #{i + 1}</p>
                                  <p className={Style.reportDate}>{formatTime12h(report.createdAt)}</p>
                                </div>
                                <span className={
                                  report.status === 'SentToPatient' || report.status === 'Finalized'
                                    ? Style.reportStatusSuccess
                                    : Style.reportStatusPending
                                }>
                                  {report.status}
                                </span>
                              </div>

                              <div className={Style.reportBody}>
                                {[
                                  { label: 'Report ID', value: `#${report.id}` },
                                  { label: 'Case ID', value: report.patientCaseId ? `#${report.patientCaseId}` : 'N/A' },
                                  { label: 'CT Scan ID', value: report.ctScanId ? `#${report.ctScanId}` : 'N/A' },
                                  {
                                    label: 'AI Classification',
                                    value: (() => {
                                      const v = report.aiClassification
                                      if (!v && v !== 0) return 'N/A'
                                      if (typeof v === 'object') return v.classification ?? v.predictedClass ?? 'N/A'
                                      return v
                                    })(),
                                  },
                                  {
                                    label: 'AI Confidence',
                                    value: report.aiConfidenceScore != null
                                      ? `${(report.aiConfidenceScore * 100).toFixed(1)}%`
                                      : 'N/A',
                                  },
                                  { label: 'Final Classification', value: report.finalClassification ?? 'N/A' },
                                  { label: 'AI Overridden', value: report.isAIOverridden ? 'Yes' : 'No' },
                                  { label: 'Override Reason', value: report.overrideReason || '—' },
                                  { label: 'Doctor Notes', value: report.doctorNotes || '—' },
                                  { label: 'Recommendations', value: report.recommendations || '—' },
                                  { label: 'Prescription', value: report.prescription || '—' },
                                  { label: 'Status', value: report.status ?? 'N/A' },
                                  { label: 'Finalized At', value: report.finalizedAt ? formatTime12h(report.finalizedAt) : '—' },
                                  { label: 'Sent To Patient At', value: report.sentToPatientAt ? formatTime12h(report.sentToPatientAt) : '—' },
                                  { label: 'Created At', value: report.createdAt ? formatTime12h(report.createdAt) : '—' },
                                ].map(({ label, value }) => (
                                  <div key={label} className={Style.reportRow}>
                                    <span className={Style.reportLabel}>{label}</span>
                                    <span className={`${Style.reportValue} ${
                                      label === 'Status'
                                        ? (value === 'SentToPatient' || value === 'Finalized' ? Style.valueSuccess : Style.valueWarning)
                                        : (label === 'AI Classification' || label === 'Final Classification' ? Style.valuePrimary : '')
                                    }`}>
                                      {value !== null && value !== undefined && typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : String(value ?? '—')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
                          <i className="fa-solid fa-file-circle-xmark"
                            style={{ fontSize: '32px', marginBottom: '10px', display: 'block' }} />
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>No reports yet</p>
                          <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                            Use the button above to write a report for this case
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}