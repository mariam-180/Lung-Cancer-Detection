import React, { useEffect, useState, useCallback } from 'react'
import Style from './DoctorPatients.module.css'
import { useAuth } from '../../Context/AuthContext'
import axios from 'axios'

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor'
const MEDIA_BASE = 'https://lungcancer.runasp.net'
const ITEMS_PER_PAGE = 4

function getPatientId(patient) {
  return patient?.id ?? null
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function resolveUrl(path) {
  if (!path) return null
  return path.startsWith('http') ? path : `${MEDIA_BASE}${path}`
}

function formatDate(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function DoctorPatients() {
  const { token } = useAuth()

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedPatient, setSelectedPatient] = useState(null)
  const [scans, setScans] = useState([])
  const [scansLoading, setScansLoading] = useState(false)

  const [scansCache, setScansCache] = useState({})
  const [ctModalImage, setCtModalImage] = useState(null)

  useEffect(() => {
    fetchPatients()
  }, [token])

  // ✅ Listen for new case creation and re-fetch patients
  useEffect(() => {
    function handleCaseCreated() {
      fetchPatients()
    }
    window.addEventListener('caseCreated', handleCaseCreated)
    return () => {
      window.removeEventListener('caseCreated', handleCaseCreated)
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  async function fetchPatients() {
    try {
      setLoading(true)
      setError('')

      const res = await axios.get(`${BASE_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          PageNumber: 1,
          PageSize: 100,
        },
      })

      const data = res.data?.data ?? res.data
      const items = Array.isArray(data) ? data : data?.items ?? []

      setPatients(items)

    } catch (err) {
      console.error(err)
      setError('Failed to load patients.')
    } finally {
      setLoading(false)
    }
  }

  const fetchScans = useCallback(async (patientId) => {

    if (scansCache[patientId] !== undefined) {
      return scansCache[patientId]
    }

    try {
      setScansLoading(true)

      const res = await axios.get(
        `${BASE_URL}/patients/${patientId}/scans`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const raw = res.data?.data ?? res.data
      const result = Array.isArray(raw) ? raw : []

      setScansCache(prev => ({
        ...prev,
        [patientId]: result,
      }))

      return result

    } catch (err) {
      console.error(err)

      setScansCache(prev => ({
        ...prev,
        [patientId]: [],
      }))

      return []

    } finally {
      setScansLoading(false)
    }

  }, [token, scansCache])

  async function handleViewDetails(patient) {
    setSelectedPatient(patient)
    setScans([])

    const id = getPatientId(patient)

    if (id === null) return

    const result = await fetchScans(id)

    setScans(result)
  }

  function handleCloseModal() {
    setSelectedPatient(null)
    setScans([])
  }

  const filteredPatients = patients.filter(p =>
    (p.fullName || p.name || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / ITEMS_PER_PAGE)
  )

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className={Style.wrapper}>
      <div className={Style.container}>

        {/* HEADER */}
        <div className={Style.header}>

          <div>
            <h2 className={Style.title}>
              Patients Management
            </h2>

            <p className={Style.subtitle}>
              {loading
                ? 'Loading patients...'
                : `${filteredPatients.length} patients found`
              }
            </p>
          </div>

          <div className={Style.searchWrapper}>
            <i className={`fa-solid fa-magnifying-glass ${Style.searchIcon}`}></i>

            <input
              type="text"
              placeholder="Search patient..."
              className={Style.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className={Style.errorBox}>
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className={Style.loading}>
            <i className="fa-solid fa-spinner fa-spin"></i>
            Loading patients...
          </div>
        )}

        {/* GRID */}
        {!loading && !error && (
          <>
            <div className={Style.grid}>

              {filteredPatients.length === 0 ? (
                <div className={Style.empty}>
                  <i className="fa-solid fa-users"></i>
                  <p>No patients found.</p>
                </div>
              ) : (
                paginatedPatients.map((patient, index) => {

                  const id = getPatientId(patient)

                  return (
                    <div
                      key={id ?? index}
                      className={Style.card}
                    >

                      <div className={Style.cardTop}>

                        <div className={Style.cardUser}>

                          <div className={Style.avatar}>
                            {getInitial(patient.fullName || patient.name)}
                          </div>

                          <div>
                            <h3 className={Style.patientName}>
                              {patient.fullName || patient.name || 'Unknown'}
                            </h3>

                            <p className={Style.patientId}>
                              ID: #{id ?? 'N/A'}
                            </p>
                          </div>

                        </div>

                      </div>

                      <div className={Style.divider}></div>

                      <div className={Style.infoSection}>

                        <div className={Style.infoRow}>
                          <i className="fa-solid fa-envelope"></i>

                          <span className={Style.infoLabel}>
                            Email
                          </span>

                          <span className={Style.infoValue}>
                            {patient.email || 'N/A'}
                          </span>
                        </div>

                        <div className={Style.infoRow}>
                          <i className="fa-solid fa-phone"></i>

                          <span className={Style.infoLabel}>
                            Phone
                          </span>

                          <span className={Style.infoValue}>
                            {patient.phoneNumber || patient.phone || 'N/A'}
                          </span>
                        </div>

                      </div>

                      <div className={Style.actions}>

                        <button
                          className={Style.viewBtn}
                          onClick={() => handleViewDetails(patient)}
                        >
                          <i className="fa-solid fa-eye"></i>
                          View Details
                        </button>

                      </div>

                    </div>
                  )

                })
              )}

            </div>

            {/* PAGINATION */}
            {filteredPatients.length > 0 && (
              <div className={Style.pagination}>

                <button
                  className={Style.pageArrow}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`${Style.pageBtn} ${currentPage === page ? Style.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  className={Style.pageArrow}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>

              </div>
            )}

          </>
        )}

        {/* MODAL */}
        {selectedPatient && (
          <div
            className={Style.modalOverlay}
            onClick={handleCloseModal}
          >

            <div
              className={Style.modal}
              onClick={(e) => e.stopPropagation()}
            >

              {/* MODAL HEADER */}
              <div className={Style.modalHeader}>

                <div className={Style.modalAvatar}>
                  {getInitial(selectedPatient.fullName || selectedPatient.name)}
                </div>

                <div>
                  <h2>
                    {selectedPatient.fullName || selectedPatient.name || 'Unknown'}
                  </h2>
                  <p>Patient Details</p>
                </div>

              </div>

              {/* CT SCAN */}
              {scansLoading ? (

                <div className={Style.modalCtLoading}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Loading CT scans...
                </div>

              ) : scans.length > 0 ? (

                (() => {
                  const scan = scans[0]
                  const url = resolveUrl(scan.imageUrl)

                  return (
                    <div
                      className={Style.modalCtWrap}
                      onClick={() => url && setCtModalImage(url)}
                    >

                      {url ? (
                        <img
                          src={url}
                          alt="CT Scan"
                          className={Style.modalCtImage}
                        />
                      ) : (
                        <div className={Style.noCtScan}>
                          <i className="fa-solid fa-image-slash"></i>
                          <span>Image unavailable</span>
                        </div>
                      )}

                      <div className={Style.modalCtOverlay}>
                        <i className="fa-solid fa-expand"></i>
                        Enlarge
                      </div>

                      <div className={Style.ctScanMeta}>

                        {scan.scanNotes && (
                          <span className={Style.ctScanNote}>
                            {scan.scanNotes}
                          </span>
                        )}

                        {scan.scanDate && (
                          <span className={Style.ctScanDate}>
                            <i className="fa-solid fa-calendar-days"></i>
                            {formatDate(scan.scanDate)}
                          </span>
                        )}

                      </div>

                    </div>
                  )
                })()

              ) : (

                <div className={Style.noCtScan}>
                  <i className="fa-solid fa-image-slash"></i>
                  <span>No CT scans available</span>
                </div>

              )}

              {/* PATIENT DETAILS */}
              <div className={Style.modalBody}>

                {[
                  { label: 'Email',       icon: 'fa-envelope',    value: selectedPatient.email },
                  { label: 'Phone',       icon: 'fa-phone',       value: selectedPatient.phoneNumber || selectedPatient.phone },
                  { label: 'Gender',      icon: 'fa-venus-mars',  value: selectedPatient.gender },
                  { label: 'Date of Birth', icon: 'fa-cake-candles', value: formatDate(selectedPatient.dateOfBirth) },
                  { label: 'Blood Type',  icon: 'fa-droplet',     value: selectedPatient.bloodType },
                ].map(({ label, icon, value }) => (
                  value ? (
                    <div className={Style.detailItem} key={label}>
                      <span>
                        <i className={`fa-solid ${icon}`}></i>
                        {label}
                      </span>
                      <strong>{value}</strong>
                    </div>
                  ) : null
                ))}

              </div>

              <button className={Style.closeBtn} onClick={handleCloseModal}>
                Close
              </button>

            </div>

          </div>
        )}

        {/* FULL SCREEN VIEWER */}
        {ctModalImage && (
          <div
            className={Style.ctViewerOverlay}
            onClick={() => setCtModalImage(null)}
          >

            <div
              className={Style.ctViewer}
              onClick={(e) => e.stopPropagation()}
            >

              <div className={Style.ctViewerHeader}>
                <span>
                  <i className="fa-solid fa-x-ray"></i>
                  CT Scan
                </span>
                <button
                  className={Style.ctCloseBtn}
                  onClick={() => setCtModalImage(null)}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className={Style.ctViewerBody}>
                <img src={ctModalImage} alt="CT Scan Full View" />
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}