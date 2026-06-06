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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Cairo',
  })
}

function formatTimeOnly(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z')
  if (isNaN(date)) return 'N/A'
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Cairo',
  })
}

export default function Cases() {

  const { token } = useAuth()

  const [activeTab, setActiveTab] = useState('list')

  const [cases, setCases] = useState([])
  const [allPatientIds, setAllPatientIds] = useState(new Set())
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

  const [form, setForm] = useState({
    patientId: '',
    description: '',
    symptoms: '',
  })

  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  async function fetchAllPatientIds() {
    try {
      const response = await axios.get(
        `${BASE_URL}/cases`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            PageNumber: 1,
            PageSize: 9999,
            IsDescending: false,
          },
        }
      )
      const items = response.data?.data?.items || []
      setAllPatientIds(new Set(items.map((c) => Number(c.patientId))))
    } catch {
      // non-critical — silently ignore
    }
  }

  useEffect(() => {
    fetchAllPatientIds()
  }, [])

  useEffect(() => {
    fetchCases()
  }, [pageNumber, searchTerm])

  async function fetchCases() {
    try {
      setLoading(true)
      setError('')

      const response = await axios.get(
        `${BASE_URL}/cases`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            PageNumber: pageNumber,
            PageSize: pageSize,
            SearchTerm: searchTerm,
            SortBy: 'patientId',
            IsDescending: false,
          },
        }
      )

      console.log('CASES:', response.data)

      const data = response.data.data

      setCases(data?.items || [])
      setTotalPages(data?.totalPages || 0)
      setTotalCount(data?.totalCount || 0)
      setHasNextPage(data?.hasNextPage || false)
      setHasPreviousPage(data?.hasPreviousPage || false)

    } catch (err) {
      console.log(err)
      setError('Failed to load cases.')
    } finally {
      setLoading(false)
    }
  }

  async function handleViewDetail(caseItem) {
    try {
      setLoading(true)

      const response = await axios.get(
        `${BASE_URL}/cases/${caseItem.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      let fullCase = response.data.data

      if ((!fullCase.ctScans || fullCase.ctScans.length === 0) && fullCase.patientId) {

        const otherCase = cases.find(
          c =>
            c.patientId === fullCase.patientId &&
            c.id !== fullCase.id &&
            c.totalScans > 0
        )

        if (otherCase) {
          const otherResponse = await axios.get(
            `${BASE_URL}/cases/${otherCase.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          fullCase.ctScans = otherResponse.data.data.ctScans
        }
      }

      setSelectedCase(fullCase)
      setActiveTab('detail')

    } catch (err) {
      console.log(err)
      alert('Failed to load case detail.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCase() {
    try {
      setFormLoading(true)
      setFormError('')
      setFormSuccess(false)

      if (!form.patientId || !form.description || !form.symptoms) {
        setFormError('All fields are required.')
        return
      }

      await axios.post(
        `${BASE_URL}/cases`,
        {
          patientId: Number(form.patientId),
          description: form.description,
          symptoms: form.symptoms,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setFormSuccess(true)
      window.dispatchEvent(new CustomEvent('caseCreated')) // ✅ notify DoctorPatients

      setForm({
        patientId: '',
        description: '',
        symptoms: '',
      })

      fetchCases()

      setTimeout(() => {
        setActiveTab('list')
      }, 1200)

    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        'Failed to save case.'
      )
    } finally {
      setFormLoading(false)
    }
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?'
  }

  return (

    <div className={Style.casesWrapper}>

      <div className={Style.maindiv}>

        {/* TABS */}
        <div className={Style.tabs}>

          <button
            className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <i className="fa-solid fa-list"></i>
            Cases List
          </button>

          <button
            className={`${Style.tab} ${activeTab === 'new' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <i className="fa-solid fa-folder-plus"></i>
            New Case
          </button>

        </div>

        {/* LIST */}
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

            {/* SEARCH */}
            <div className={Style.filterBar}>
              <div className={Style.searchWrap}>
                <i className={`fa-solid fa-magnifying-glass ${Style.searchIcon}`}></i>
                <input
                  type="text"
                  placeholder="Search patient..."
                  className={Style.searchInput}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPageNumber(1)
                  }}
                />
              </div>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <style>{`
              @keyframes shimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>

            {/* TABLE CARD */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '480px',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              overflow: 'hidden',
              background: '#fff',
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
                        <tr key={`skel-${i}`} className={Style.tr}>
                          {[44, 160, 130, 72, 44].map((w, j) => (
                            <td key={j} className={Style.td}>
                              <div style={{
                                height: '13px',
                                width: `${w}px`,
                                maxWidth: '100%',
                                borderRadius: '6px',
                                background: 'linear-gradient(90deg,#f0f4f8 25%,#dde3ea 50%,#f0f4f8 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.4s ease-in-out infinite',
                                animationDelay: `${i * 0.1}s`,
                              }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : error ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '60px 32px', color: '#ef4444' }}>
                          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '28px', marginBottom: '10px', display: 'block' }} />
                          {error}
                        </td>
                      </tr>
                    ) : cases.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '60px 32px', color: '#94a3b8' }}>
                          No cases found.
                        </td>
                      </tr>
                    ) : (
                      [...cases]
                        .sort((a, b) => a.patientId - b.patientId)
                        .map((c) => (
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
                              <div className={Style.actions}>
                                <button
                                  className={Style.actionBtn}
                                  onClick={() => handleViewDetail(c)}
                                >
                                  <i className="fa-solid fa-eye" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>

                </table>
              </div>

              {/* PAGINATION */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 0',
                borderTop: '1px solid #e2e8f0',
                background: '#fafbfc',
              }}>

                <button
                  onClick={() => setPageNumber(prev => prev - 1)}
                  disabled={!hasPreviousPage}
                  style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    border: '1px solid #e2e8f0', background: '#fff',
                    cursor: hasPreviousPage ? 'pointer' : 'not-allowed',
                    opacity: hasPreviousPage ? 1 : 0.35,
                    fontSize: '18px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#64748b', transition: 'all 0.2s',
                  }}
                >‹</button>

                {loading ? (
                  [1, 2, 3].map(n => (
                    <div key={n} style={{
                      width: '34px', height: '34px', borderRadius: '9px',
                      background: 'linear-gradient(90deg,#f0f4f8 25%,#dde3ea 50%,#f0f4f8 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s ease-in-out infinite',
                    }} />
                  ))
                ) : (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setPageNumber(page)}
                      style={{
                        width: '34px', height: '34px', borderRadius: '9px',
                        border: page === pageNumber ? 'none' : '1px solid #e2e8f0',
                        background: page === pageNumber
                          ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
                        color: page === pageNumber ? '#fff' : '#475569',
                        fontWeight: page === pageNumber ? '700' : '500',
                        fontSize: '13px', cursor: 'pointer',
                        boxShadow: page === pageNumber ? '0 4px 12px rgba(37,99,235,0.32)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >{page}</button>
                  ))
                )}

                <button
                  onClick={() => setPageNumber(prev => prev + 1)}
                  disabled={!hasNextPage}
                  style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    border: '1px solid #e2e8f0', background: '#fff',
                    cursor: hasNextPage ? 'pointer' : 'not-allowed',
                    opacity: hasNextPage ? 1 : 0.35,
                    fontSize: '18px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#64748b', transition: 'all 0.2s',
                  }}
                >›</button>

              </div>

            </div>

          </>
        )}

        {/* NEW CASE */}
        {activeTab === 'new' && (

          <div className={Style.formSection}>

            <div className={Style.formCard}>

              <div className={Style.formCardHeader}>

                <div className={Style.formCardIcon}>
                  <i className="fa-solid fa-folder-plus"></i>
                </div>

                <div>
                  <h3 className={Style.formCardTitle}>Create New Case</h3>
                  <p className={Style.formCardSub}>Register patient case</p>
                </div>

              </div>

              <div className={Style.formGrid}>

                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Patient ID</label>
                  <input
                    type="number"
                    name="patientId"
                    value={form.patientId}
                    onChange={handleFormChange}
                    className={Style.formInput}
                    placeholder="Enter patient ID"
                  />
                </div>

                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Description</label>
                  <input
                    type="text"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    className={Style.formInput}
                    placeholder="Enter diagnosis"
                  />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Symptoms</label>
                  <textarea
                    name="symptoms"
                    value={form.symptoms}
                    onChange={handleFormChange}
                    className={`${Style.formInput} ${Style.formTextarea}`}
                    placeholder="Enter symptoms"
                  />
                </div>

              </div>

              {formError && <p style={{ color: 'red' }}>{formError}</p>}

              {formSuccess && <p style={{ color: 'green' }}>Case created successfully.</p>}

              <div className={Style.formActions}>

                <button
                  className={Style.cancelBtn}
                  onClick={() => setActiveTab('list')}
                >
                  Cancel
                </button>

                <button
                  className={Style.submitBtn}
                  disabled={formLoading}
                  onClick={handleCreateCase}
                >
                  {formLoading ? 'Creating...' : 'Create Case'}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* DETAIL */}
        {activeTab === 'detail' && (

          <div className={Style.detailSection}>

            <button
              className={Style.backBtn}
              onClick={() => setActiveTab('list')}
            >
              <i className="fa-solid fa-arrow-left"></i>
              Back to Cases
            </button>

            {!selectedCase ? (

              <p>No case selected.</p>

            ) : (

              <div className={Style.detailGrid}>

                {/* PATIENT INFO */}
                <div className={Style.detailCard}>

                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}>
                      <i className="fa-solid fa-user"></i>
                    </div>
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
                    <div className={Style.detailIcon}>
                      <i className="fa-solid fa-x-ray"></i>
                    </div>
                    <h3 className={Style.detailCardTitle}>CT Scans</h3>
                  </div>

                  <div className={Style.scanList}>

                    {selectedCase.ctScans?.length > 0 ? (

                      selectedCase.ctScans.map((scan, i) => (

                        <div key={i} className={Style.scanRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>

                          <img
                            src={`https://lungcancer.runasp.net${scan.imageUrl}`}
                            alt={scan.originalFileName || 'CT Scan'}
                            style={{
                              width: '100%',
                              maxHeight: '260px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              background: '#000',
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />

                          <div style={{
                            display: 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '120px',
                            background: '#f3f4f6',
                            borderRadius: '8px',
                            color: '#9ca3af',
                            fontSize: '14px',
                            gap: '8px',
                          }}>
                            <i className="fa-solid fa-image-slash"></i>
                            Image unavailable
                          </div>

                          <div style={{ width: '100%' }}>
                            <p className={Style.scanName} style={{ marginBottom: '4px' }}>
                              {scan.originalFileName || 'CT Scan'} &nbsp;
                              <span style={{ fontWeight: 400, fontSize: '12px', color: '#9ca3af' }}>
                                {scan.fileType} · {(scan.fileSize / 1024).toFixed(1)} KB
                              </span>
                            </p>
                            {scan.scanNotes && (
                              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0' }}>
                                <i className="fa-solid fa-note-sticky" style={{ marginRight: '5px' }}></i>
                                {scan.scanNotes}
                              </p>
                            )}
                            <p className={Style.scanMeta}>
                              <i className="fa-regular fa-clock" style={{ marginRight: '5px' }}></i>
                              {formatTime12h(scan.scanDate)}
                            </p>
                          </div>

                        </div>
                      ))

                    ) : (
                      <p>No CT scans available.</p>
                    )}

                  </div>

                </div>

                {/* REPORTS */}
                <div className={Style.detailCard}>

                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}>
                      <i className="fa-solid fa-file-waveform"></i>
                    </div>
                    <h3 className={Style.detailCardTitle}>Reports</h3>
                  </div>

                  <div className={Style.scanList}>

                    {selectedCase.reports?.length > 0 ? (

                      selectedCase.reports.map((report, i) => (

                        <div key={i} className={Style.reportCard} style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>

                          <div className={Style.reportHeader} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid #e5e7eb' }}>
                            <div className={Style.scanThumb}>
                              <i className="fa-solid fa-file-medical"></i>
                            </div>
                            <div className={Style.scanInfo}>
                              <p className={Style.scanName}>Report #{i + 1}</p>
                              <p className={Style.scanMeta}>{formatTime12h(report.createdAt)}</p>
                            </div>
                          </div>

                          <div className={Style.detailRows} style={{ padding: '0 14px' }}>
                            {Object.entries(report)
                              .filter(([key]) => !['id', 'caseId'].includes(key))
                              .map(([key, value]) => (
                                <div key={key} className={Style.detailRow}>
                                  <span className={Style.detailLabel}>
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                  </span>
                                  <span className={Style.detailValue}>
                                    {value !== null && value !== undefined && value !== ''
                                      ? String(value)
                                      : 'N/A'}
                                  </span>
                                </div>
                              ))}
                          </div>

                        </div>
                      ))

                    ) : (
                      <p>No reports available.</p>
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