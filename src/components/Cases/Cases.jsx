import React, { useState, useEffect } from 'react'
import Style from './Cases.module.css'
import { useAuth } from '../../Context/AuthContext'
import axios from 'axios'

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor'

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
        @keyframes toastOut {
          from { opacity:1; }
          to   { opacity:0; transform:translateY(-10px); }
        }
        @keyframes progress {
          from { width:100%; }
          to   { width:0%;   }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 99999,
        width: '340px', borderRadius: '16px',
        background: cfg.bg, border: `1.5px solid ${cfg.border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        {/* Body */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px' }}>
          {/* Icon */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: cfg.iconBg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${cfg.iconBg}55`,
          }}>
            <i className={`fa-solid ${cfg.icon}`} style={{ color: '#fff', fontSize: '18px' }} />
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: cfg.text }}>
              {cfg.title}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: cfg.text, opacity: 0.85, lineHeight: 1.4 }}>
              {message}
            </p>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: cfg.text, opacity: 0.5, fontSize: '16px',
            padding: '0', lineHeight: 1, flexShrink: 0,
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Progress bar */}
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
  const pageSize = 5
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCase, setSelectedCase] = useState(null)
  const [form, setForm] = useState({ patientId: '', description: '', symptoms: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  useEffect(() => { fetchCases() }, [pageNumber, searchTerm])

  async function fetchCases() {
    try {
      setLoading(true); setError('')
      const res = await axios.get(`${BASE_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { PageNumber: pageNumber, PageSize: pageSize, SearchTerm: searchTerm, SortBy: 'patientId', IsDescending: false },
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
      let fullCase = res.data.data
      if ((!fullCase.ctScans || fullCase.ctScans.length === 0) && fullCase.patientId) {
        const other = cases.find(c => c.patientId === fullCase.patientId && c.id !== fullCase.id && c.totalScans > 0)
        if (other) {
          const r2 = await axios.get(`${BASE_URL}/cases/${other.id}`, { headers: { Authorization: `Bearer ${token}` } })
          fullCase.ctScans = r2.data.data.ctScans
        }
      }
      setSelectedCase(fullCase); setActiveTab('detail')
    } catch { showToast('Failed to load case detail.', 'error') }
    finally { setLoading(false) }
  }

  async function handleCreateCase() {
    try {
      setFormLoading(true); setFormError('')
      if (!form.patientId || !form.description || !form.symptoms) {
        setFormError('All fields are required.'); return
      }
      await axios.post(`${BASE_URL}/cases`,
        { patientId: Number(form.patientId), description: form.description, symptoms: form.symptoms },
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

  return (
    <div className={Style.casesWrapper}>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className={Style.maindiv}>

        {/* TABS */}
        <div className={Style.tabs}>
          <button className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`} onClick={() => setActiveTab('list')}>
            <i className="fa-solid fa-list" /> Cases List
          </button>
          <button className={`${Style.tab} ${activeTab === 'new' ? Style.activeTab : ''}`} onClick={() => setActiveTab('new')}>
            <i className="fa-solid fa-folder-plus" /> New Case
          </button>
        </div>

        {/* ── LIST ── */}
        {activeTab === 'list' && (
          <>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Patient Cases</h2>
                <p className={Style.subtitle}>{loading ? 'Loading...' : `${totalCount} records found`}</p>
              </div>
            </div>

            <div className={Style.filterBar}>
              <div className={Style.searchWrap}>
                <i className={`fa-solid fa-magnifying-glass ${Style.searchIcon}`} />
                <input
                  type="text" placeholder="Search patient..."
                  className={Style.searchInput} value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPageNumber(1) }}
                />
              </div>
            </div>

            <style>{`
              @keyframes shimmer {
                0%   { background-position:  200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>

            <div style={{
              display: 'flex', flexDirection: 'column', height: '480px',
              border: '1px solid #e2e8f0', borderRadius: '14px',
              overflow: 'hidden', background: '#fff',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className={Style.table} style={{ width: '100%' }}>
                  <thead>
                    <tr className={Style.theadRow}>
                      <th className={Style.th}>Patient ID</th>
                      <th className={Style.th}>Patient Name</th>
                      <th className={Style.th}>Description</th>
                      <th className={Style.th}>Created At</th>
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
                                height: '13px', width: `${w}px`, maxWidth: '100%', borderRadius: '6px',
                                background: 'linear-gradient(90deg,#f0f4f8 25%,#dde3ea 50%,#f0f4f8 75%)',
                                backgroundSize: '200% 100%', animation: `shimmer 1.4s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`,
                              }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : error ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
                        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '28px', display: 'block', marginBottom: '10px' }} />
                        {error}
                      </td></tr>
                    ) : cases.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>No cases found.</td></tr>
                    ) : (
                      [...cases].sort((a, b) => a.patientId - b.patientId).map(c => (
                        <tr key={c.id} className={Style.tr}>
                          <td className={Style.td}>{c.patientId}</td>
                          <td className={Style.td}>
                            <div className={Style.nameCell}>
                              <div className={Style.avatar}>{getInitial(c.patientName)}</div>
                              <span>{c.patientName || 'N/A'}</span>
                            </div>
                          </td>
                          <td className={Style.td}>{c.description || 'N/A'}</td>
                          <td className={Style.td}>{formatTimeOnly(c.createdAt)}</td>
                          <td className={Style.td}>
                            <button className={Style.actionBtn} onClick={() => handleViewDetail(c)}>
                              <i className="fa-solid fa-eye" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: '7px', padding: '10px 0', borderTop: '1px solid #e2e8f0', background: '#fafbfc',
              }}>
                {[
                  { label: '‹', action: () => setPageNumber(p => p - 1), disabled: !hasPreviousPage },
                  { label: '›', action: () => setPageNumber(p => p + 1), disabled: !hasNextPage },
                ].map((btn, idx) => idx === 0 ? (
                  <button key={idx} onClick={btn.action} disabled={btn.disabled} style={{
                    width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #e2e8f0',
                    background: '#fff', cursor: btn.disabled ? 'not-allowed' : 'pointer',
                    opacity: btn.disabled ? 0.35 : 1, fontSize: '18px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#64748b',
                  }}>{btn.label}</button>
                ) : (
                  [
                    <button key="prev" onClick={() => setPageNumber(p => p - 1)} disabled={!hasPreviousPage} style={{
                      width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #e2e8f0',
                      background: '#fff', cursor: !hasPreviousPage ? 'not-allowed' : 'pointer',
                      opacity: !hasPreviousPage ? 0.35 : 1, fontSize: '18px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#64748b',
                    }}>‹</button>,
                    ...Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button key={page} onClick={() => setPageNumber(page)} style={{
                        width: '34px', height: '34px', borderRadius: '9px',
                        border: page === pageNumber ? 'none' : '1px solid #e2e8f0',
                        background: page === pageNumber ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
                        color: page === pageNumber ? '#fff' : '#475569',
                        fontWeight: page === pageNumber ? '700' : '500',
                        fontSize: '13px', cursor: 'pointer',
                        boxShadow: page === pageNumber ? '0 4px 12px rgba(37,99,235,0.32)' : 'none',
                      }}>{page}</button>
                    )),
                    <button key="next" onClick={() => setPageNumber(p => p + 1)} disabled={!hasNextPage} style={{
                      width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #e2e8f0',
                      background: '#fff', cursor: !hasNextPage ? 'not-allowed' : 'pointer',
                      opacity: !hasNextPage ? 0.35 : 1, fontSize: '18px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#64748b',
                    }}>›</button>,
                  ]
                ))}
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
              <div className={Style.formGrid}>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Patient ID</label>
                  <input type="number" name="patientId" value={form.patientId}
                    onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={Style.formInput} placeholder="Enter patient ID" />
                </div>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Description</label>
                  <input type="text" name="description" value={form.description}
                    onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={Style.formInput} placeholder="Enter description" />
                </div>
                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Symptoms</label>
                  <textarea name="symptoms" value={form.symptoms}
                    onChange={e => setForm({ ...form, [e.target.name]: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextarea}`} placeholder="Enter symptoms" />
                </div>
              </div>
              {formError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                  borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#b91c1c', fontSize: '13px', marginTop: '8px',
                }}>
                  <i className="fa-solid fa-circle-exclamation" /> {formError}
                </div>
              )}
              <div className={Style.formActions}>
                <button className={Style.cancelBtn} onClick={() => setActiveTab('list')}>Cancel</button>
                <button className={Style.submitBtn} disabled={formLoading} onClick={handleCreateCase}>
                  {formLoading ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />Creating...</> : 'Create Case'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL ── */}
        {activeTab === 'detail' && (
          <div className={Style.detailSection}>
            <button className={Style.backBtn} onClick={() => setActiveTab('list')}>
              <i className="fa-solid fa-arrow-left" /> Back to Cases
            </button>

            {!selectedCase ? <p>No case selected.</p> : (
              <div className={Style.detailGrid}>

                {/* PATIENT INFO */}
                <div className={Style.detailCard}>
                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}><i className="fa-solid fa-user" /></div>
                    <h3 className={Style.detailCardTitle}>Patient Info</h3>
                  </div>
                  <div className={Style.detailRows}>
                    {[
                      { label: 'Case ID',       value: selectedCase.id },
                      { label: 'Case Number',   value: selectedCase.caseNumber },
                      { label: 'Patient Name',  value: selectedCase.patientName },
                      { label: 'Patient ID',    value: selectedCase.patientId },
                      { label: 'Doctor',        value: selectedCase.doctorName },
                      { label: 'Description',   value: selectedCase.description },
                      { label: 'Symptoms',      value: selectedCase.symptoms },
                      { label: 'Created At',    value: formatTime12h(selectedCase.createdAt) },
                      { label: 'Total Scans',   value: selectedCase.totalScans ?? 0 },
                      { label: 'Total Reports', value: selectedCase.totalReports ?? 0 },
                    ].map(({ label, value }) => (
                      <div className={Style.detailRow} key={label}>
                        <span className={Style.detailLabel}>{label}</span>
                        <span className={Style.detailValue}>{value ?? 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CT SCANS — compact */}
                <div className={Style.detailCard}>
                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}><i className="fa-solid fa-x-ray" /></div>
                    <h3 className={Style.detailCardTitle}>CT Scans</h3>
                  </div>
                  <div className={Style.scanList}>
                    {selectedCase.ctScans?.length > 0 ? selectedCase.ctScans.map((scan, i) => (
                      <div key={i} style={{
                        padding: '10px 0',
                        borderBottom: i < selectedCase.ctScans.length - 1 ? '1px solid #f0f4f8' : 'none',
                      }}>
                        {/* Image — reduced height */}
                        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                          <img
                            src={`https://lungcancer.runasp.net${scan.imageUrl}`}
                            alt={scan.originalFileName || 'CT Scan'}
                            style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', background: '#000' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                          />
                          <div style={{
                            display: 'none', alignItems: 'center', justifyContent: 'center',
                            height: '80px', background: '#f3f4f6',
                            color: '#9ca3af', fontSize: '13px', gap: '6px',
                          }}>
                            <i className="fa-solid fa-image-slash" /> Image unavailable
                          </div>
                        </div>

                        {/* Meta — compact */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#374151',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {scan.originalFileName || `Scan #${i + 1}`}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                              #{scan.id} · {scan.fileType} · {(scan.fileSize / 1024).toFixed(1)} KB · {formatTimeOnly(scan.scanDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) : <p style={{ color: '#94a3b8', fontSize: '13px' }}>No CT scans available.</p>}
                  </div>
                </div>

                {/* REPORTS */}
                <div className={Style.detailCard}>
                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}><i className="fa-solid fa-file-waveform" /></div>
                    <h3 className={Style.detailCardTitle}>Reports</h3>
                  </div>
                  <div className={Style.scanList}>

                    {/* Write report buttons */}
                    {selectedCase.ctScans?.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8',
                          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Write a report for:
                        </p>
                        {selectedCase.ctScans.map((scan, i) => (
                          <button key={scan.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                              padding: '9px 12px', marginBottom: '6px', borderRadius: '10px',
                              border: '1px solid #dbeafe',
                              background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#dbeafe,#bfdbfe)'; e.currentTarget.style.borderColor = '#93c5fd' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#eff6ff,#dbeafe)'; e.currentTarget.style.borderColor = '#dbeafe' }}
                            onClick={() => {
                              localStorage.setItem('prefill_report', JSON.stringify({ patientCaseId: selectedCase.id, ctScanId: scan.id }))
                              window.dispatchEvent(new CustomEvent('openReportForm'))
                              setTimeout(() => document.querySelector('.reportsection')?.scrollIntoView({ behavior: 'smooth' }), 50)
                            }}
                          >
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                              background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <i className="fa-solid fa-file-pen" style={{ color: '#fff', fontSize: '13px' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#1e40af',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {scan.originalFileName || `Scan #${i + 1}`}
                              </p>
                              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                                ID #{scan.id} · {formatTimeOnly(scan.scanDate)}
                              </p>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb',
                              display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                              Write <i className="fa-solid fa-arrow-right" style={{ fontSize: '9px' }} />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Existing reports */}
                    {selectedCase.reports?.length > 0 ? (
                      <>
                        <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8',
                          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Existing Reports
                        </p>
                        {selectedCase.reports.map((report, i) => (
                          <div key={i} style={{
                            marginBottom: '10px', border: '1px solid #e5e7eb',
                            borderRadius: '10px', overflow: 'hidden',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 12px', background: '#f8fafc',
                              borderBottom: '1px solid #e5e7eb',
                            }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '7px',
                                background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <i className="fa-solid fa-file-medical" style={{ color: '#fff', fontSize: '12px' }} />
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                                  Report #{i + 1}
                                </p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                                  {formatTime12h(report.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div style={{ padding: '6px 12px' }}>
                              {Object.entries(report)
                                .filter(([key]) => !['id', 'caseId'].includes(key))
                                .map(([key, value]) => (
                                  <div key={key} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'flex-start', padding: '5px 0',
                                    borderBottom: '1px solid #f1f5f9', gap: '12px',
                                  }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', flexShrink: 0 }}>
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#1e293b', textAlign: 'right', wordBreak: 'break-word' }}>
                                      {value !== null && value !== undefined && value !== '' ? String(value) : 'N/A'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '13px' }}>No reports yet.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}