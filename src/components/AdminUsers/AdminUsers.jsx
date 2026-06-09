


///my code
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Style from './AdminUsers.module.css'

const BASE      = 'https://lungcancer.runasp.net/api/Admin'
const USERS_API = `${BASE}/users`
const DOCS_API  = `${BASE}/doctors`

const getToken    = () => localStorage.getItem('token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
})

const resolveUserId   = (u) => u?.userId   ?? u?.UserId   ?? u?.id   ?? null
const resolveDoctorId = (d) => d?.doctorId ?? d?.DoctorId ?? d?.id   ?? null

const extractList = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  const keys = ['items', 'users', 'doctors', 'data', 'results', 'records', 'list', 'content']
  for (const k of keys) if (Array.isArray(data[k])) return data[k]
  if (data.data && typeof data.data === 'object') {
    for (const k of keys) if (Array.isArray(data.data[k])) return data.data[k]
    if (Array.isArray(data.data)) return data.data
  }
  if (typeof data === 'object') return [data]
  return []
}

const extractTotal = (data) => {
  if (!data || Array.isArray(data)) return 0
  return (
    data.totalCount ?? data.total ?? data.totalItems ??
    data.count ?? data.totalRecords ??
    data.data?.totalCount ?? data.data?.total ?? 0
  )
}

function resolveStatus(user, pendingEmails, rejectedEmails) {
  const role     = (user?.role ?? user?.roles?.[0] ?? '').toLowerCase()
  const isActive = user?.isActive ?? user?.IsActive ?? false
  const email    = (user?.email ?? '').toLowerCase()

  if (email && pendingEmails.has(email))  return 'pending'
  if (email && rejectedEmails.has(email)) return 'rejected'
  if (role === 'doctor' && !isActive)     return 'inactive'
  return isActive ? 'active' : 'inactive'
}

const STATUS_COLOR = {
  active:   { label: 'Active',   cls: 'active'   },
  pending:  { label: 'Pending',  cls: 'pending'  },
  rejected: { label: 'Rejected', cls: 'rejected' },
  inactive: { label: 'Inactive', cls: 'inactive' },
}

export default function AdminUsers() {
  const [activeTab, setActiveTab]       = useState('list')
  const [roleFilter, setRoleFilter]     = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)

  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize]                  = useState(4)
  const [totalCount, setTotalCount] = useState(0)

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError]     = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusMsg, setStatusMsg]         = useState(null)

  const [pendingDocs, setPendingDocs]       = useState([])
  const [rejectedDocs, setRejectedDocs]     = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError]     = useState(null)
  const [approvingId, setApprovingId]       = useState(null)
  const [approveMsg, setApproveMsg]         = useState(null)

  const [pendingEmails, setPendingEmails]   = useState(new Set())
  const [rejectedEmails, setRejectedEmails] = useState(new Set())
  const [pendingSubTab, setPendingSubTab]   = useState('pending')

  const doFetchUsers = useRef(null)

  // ── Helpers ──
  const getRoleBadgeClass = (role) => {
    const r = (role ?? '').toLowerCase()
    if (r === 'doctor')  return Style.roleDoctor
    if (r === 'patient') return Style.rolePatient
    if (r === 'admin')   return Style.roleAdmin
    return ''
  }
  const getRoleIcon = (role) => {
    const r = (role ?? '').toLowerCase()
    if (r === 'doctor')  return 'fa-solid fa-user-doctor'
    if (r === 'patient') return 'fa-solid fa-user'
    if (r === 'admin')   return 'fa-solid fa-shield'
    return 'fa-solid fa-user'
  }
  const getAvatarLetter = (user) =>
    ((user?.fullName ?? user?.name ?? user?.email ?? '?')[0] ?? '?').toUpperCase()
  const avatarClasses = [Style.avatar, Style.avatar2, Style.avatar3, Style.avatar4, Style.avatar5]
  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'

  const StatusBadge = ({ user }) => {
    const s = resolveStatus(user, pendingEmails, rejectedEmails)
    const { label, cls } = STATUS_COLOR[s] ?? { label: s, cls: 'inactive' }
    return (
      <span className={`${Style.statusBadge} ${Style[cls]}`}>
        <span className={Style.dot}></span>{label}
      </span>
    )
  }

  // ── GET /users ──
  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ PageNumber: pageNumber, PageSize: pageSize })
      if (searchTerm)           params.append('SearchTerm', searchTerm)
      if (roleFilter !== 'all') params.append('role', roleFilter)

      const res  = await fetch(`${USERS_API}?${params}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data  = await res.json()
      const list  = extractList(data)
      const total = extractTotal(data)
      setUsers(list)
      setTotalCount(total || list.length)
    } catch (err) {
      setError(err.message); setUsers([])
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, searchTerm, roleFilter])

  useEffect(() => { doFetchUsers.current = fetchUsers }, [fetchUsers])
  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { setPageNumber(1) }, [roleFilter, searchTerm])

  const totalPages = Math.ceil(totalCount / pageSize)

  // ── GET /users/{userId} ──
  const fetchUserDetail = async (uid) => {
    if (!uid) return
    setDetailLoading(true); setDetailError(null); setStatusMsg(null)
    try {
      const res  = await fetch(`${USERS_API}/${uid}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const json = await res.json()
      setSelectedUser(json?.data ?? json?.user ?? json)
    } catch (err) { setDetailError(err.message) }
    finally { setDetailLoading(false) }
  }

  const handleViewDetail = async (user) => {
    const uid = resolveUserId(user)
    setSelectedUser(user)
    setActiveTab('detail')
    setStatusMsg(null)
    if (uid) await fetchUserDetail(uid)
    else setDetailError('User ID not found — showing cached data only.')
  }

  // ── PUT /users/{userId}/status ──
  const updateStatus = async (user, newIsActive) => {
    const uid = resolveUserId(user)
    if (!uid) { setStatusMsg({ type: 'error', text: 'Cannot update: user ID missing.' }); return }
    setStatusLoading(true); setStatusMsg(null)
    try {
      const res = await fetch(`${USERS_API}/${uid}/status`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isActive: newIsActive }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      setStatusMsg({ type: 'success', text: `User ${newIsActive ? 'activated' : 'deactivated'} successfully.` })

      const email = (user?.email ?? selectedUser?.email ?? '').toLowerCase()
      if (email) {
        setPendingEmails(prev  => { const n = new Set(prev); n.delete(email); return n })
        setRejectedEmails(prev => { const n = new Set(prev); n.delete(email); return n })
      }

      const patch = (u) => resolveUserId(u) === uid ? { ...u, isActive: newIsActive } : u
      setUsers(prev => prev.map(patch))
      if (resolveUserId(selectedUser) === uid)
        setSelectedUser(prev => ({ ...prev, isActive: newIsActive }))
    } catch (err) { setStatusMsg({ type: 'error', text: err.message }) }
    finally { setStatusLoading(false) }
  }

  // ── GET /doctors/pending ──
  const fetchPendingDoctors = useCallback(async () => {
    setPendingLoading(true); setPendingError(null)
    try {
      const res  = await fetch(`${DOCS_API}/pending?PageNumber=1&PageSize=200`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data = await res.json()
      const list = extractList(data)
      setPendingDocs(list)
      const emails = new Set(list.map(d => (d?.email ?? '').toLowerCase()).filter(Boolean))
      setPendingEmails(emails)
    } catch (err) { setPendingError(err.message); setPendingDocs([]) }
    finally { setPendingLoading(false) }
  }, [])

  // ── Derive rejected doctors from users list ──
  useEffect(() => {
    const rejected = users.filter(u => {
      const role     = (u?.role ?? '').toLowerCase()
      const isActive = u?.isActive ?? false
      const email    = (u?.email ?? '').toLowerCase()
      return role === 'doctor' && !isActive && !pendingEmails.has(email)
    })
    setRejectedDocs(rejected)
    const emails = new Set(rejected.map(u => (u?.email ?? '').toLowerCase()).filter(Boolean))
    setRejectedEmails(emails)
  }, [users, pendingEmails])

  useEffect(() => { fetchPendingDoctors() }, [fetchPendingDoctors])
  useEffect(() => { if (activeTab === 'pending') fetchPendingDoctors() }, [activeTab, fetchPendingDoctors])

  // ── POST /doctors/{doctorId}/approve ──
  const approveDoctor = async (doc, isApproved = true, rejectionReason = '') => {
    const did   = resolveDoctorId(doc) ?? resolveUserId(doc)
    const email = (doc?.email ?? '').toLowerCase()

    if (!did) { setApproveMsg({ type: 'error', text: 'Cannot approve: doctor ID missing.' }); return }
    setApprovingId(did); setApproveMsg(null)

    try {
      const res = await fetch(`${DOCS_API}/${did}/approve`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ isApproved, rejectionReason }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)

      setApproveMsg({ type: 'success', text: isApproved ? 'Doctor approved successfully.' : 'Doctor rejected successfully.' })

      setPendingDocs(prev => prev.filter(d => resolveDoctorId(d) !== did))
      setPendingEmails(prev => { const n = new Set(prev); n.delete(email); return n })

      if (isApproved) {
        setRejectedEmails(prev => { const n = new Set(prev); n.delete(email); return n })
      }

      if (doFetchUsers.current) await doFetchUsers.current()
    } catch (err) { setApproveMsg({ type: 'error', text: err.message }) }
    finally { setApprovingId(null) }
  }

  const pendingCount  = pendingDocs.length
  const rejectedCount = rejectedDocs.length

  // ── RENDER ──
  return (
    <div className={Style.wrapper}>
      <div className={Style.maindiv}>

        {/* Tabs */}
        <div className={Style.tabs}>
          <button
            className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <i className="fa-solid fa-users"></i> All Users
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'pending' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <i className="fa-solid fa-user-clock"></i> Doctor Approvals
            {(pendingCount + rejectedCount) > 0 && (
              <span className={Style.tabBadge}>{pendingCount + rejectedCount}</span>
            )}
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'detail' ? Style.activeTab : ''}`}
            onClick={() => selectedUser && setActiveTab('detail')}
            disabled={!selectedUser}
          >
            <i className="fa-solid fa-user"></i> User Detail
          </button>
        </div>

        {/* ══ Tab: All Users ══ */}
        {activeTab === 'list' && (
          <>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Users Management</h2>
                <p className={Style.subtitle}>
                  {loading ? 'Loading…' : `${totalCount} user${totalCount !== 1 ? 's' : ''} found`}
                </p>
              </div>
              <div className={Style.searchBox}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Search users…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={Style.searchInput}
                />
                {searchTerm && (
                  <button className={Style.clearSearch} onClick={() => setSearchTerm('')}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            </div>

            <div className={Style.filterBar}>
              <div className={Style.rolePills}>
                {[
                  { key: 'all',     label: 'All',      icon: null },
                  { key: 'doctor',  label: 'Doctors',  icon: 'fa-solid fa-user-doctor' },
                  { key: 'patient', label: 'Patients', icon: 'fa-solid fa-user' },
                  { key: 'admin',   label: 'Admins',   icon: 'fa-solid fa-shield' },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    className={`${Style.pill} ${roleFilter === key ? Style.pillActive : ''}`}
                    onClick={() => setRoleFilter(key)}
                  >
                    {icon && <i className={icon}></i>} {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className={Style.errorBanner}>
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
                <button onClick={fetchUsers} className={Style.retryBtn}>
                  <i className="fa-solid fa-rotate-right"></i> Retry
                </button>
              </div>
            )}

            <div className={Style.tableContainer}>
              {loading ? (
                <div className={Style.loadingWrap}>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading users…
                </div>
              ) : (
                <table className={Style.table}>
                  <thead>
                    <tr className={Style.theadRow}>
                      <th className={Style.th}>User</th>
                      <th className={Style.th}>Role</th>
                      <th className={Style.th}>Email</th>
                      <th className={Style.th}>Status</th>
                      <th className={Style.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!Array.isArray(users) || users.length === 0 ? (
                      <tr><td colSpan={5} className={Style.emptyRow}>No users found.</td></tr>
                    ) : (
                      users.map((user, idx) => {
                        const uid      = resolveUserId(user)
                        const role     = user?.role ?? user?.roles?.[0] ?? 'Unknown'
                        const status   = resolveStatus(user, pendingEmails, rejectedEmails)
                        const isActive = status === 'active'
                        const canToggle = status !== 'pending'

                        return (
                          <tr key={uid ?? idx} className={Style.tr}>
                            <td className={Style.td}>
                              <div className={Style.nameCell}>
                                <div className={avatarClasses[idx % avatarClasses.length]}>
                                  {getAvatarLetter(user)}
                                </div>
                                <div>
                                  <p className={Style.userName}>{user?.fullName ?? user?.name ?? '—'}</p>
                                  <p className={Style.userId}>#{uid ? uid.toString().slice(0, 8) : idx + 1}</p>
                                </div>
                              </div>
                            </td>
                            <td className={Style.td}>
                              <span className={`${Style.roleBadge} ${getRoleBadgeClass(role)}`}>
                                <i className={getRoleIcon(role)}></i> {role}
                              </span>
                            </td>
                            <td className={Style.td}>
                              <span className={Style.emailCell}>{user?.email ?? '—'}</span>
                            </td>
                            <td className={Style.td}>
                              <StatusBadge user={user} />
                            </td>
                            <td className={Style.td}>
                              <div className={Style.actions}>
                                <button
                                  className={Style.actionBtn}
                                  title="View"
                                  onClick={() => handleViewDetail(user)}
                                >
                                  <i className="fa-solid fa-eye"></i>
                                </button>
                                <button
                                  className={`${Style.actionBtn} ${isActive ? Style.deactivateBtn : Style.activateBtn}`}
                                  title={isActive ? 'Deactivate' : 'Activate'}
                                  disabled={statusLoading || !canToggle}
                                  onClick={() => canToggle && updateStatus(user, !isActive)}
                                >
                                  <i className={`fa-solid ${isActive ? 'fa-ban' : 'fa-circle-check'}`}></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className={Style.pagination}>
                <button
                  className={Style.pageBtn}
                  disabled={pageNumber === 1}
                  onClick={() => setPageNumber(p => p - 1)}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`${Style.pageBtn} ${p === pageNumber ? Style.pageBtnActive : ''}`}
                    onClick={() => setPageNumber(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className={Style.pageBtn}
                  disabled={pageNumber === totalPages}
                  onClick={() => setPageNumber(p => p + 1)}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}

        {/* ══ Tab: Doctor Approvals ══ */}
        {activeTab === 'pending' && (
          <div className={Style.detailSection}>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Doctor Approvals</h2>
                <p className={Style.subtitle}>
                  {pendingLoading ? 'Loading…' : `${pendingCount} pending · ${rejectedCount} rejected`}
                </p>
              </div>
              <button className={Style.retryBtn} onClick={fetchPendingDoctors}>
                <i className="fa-solid fa-rotate-right"></i> Refresh
              </button>
            </div>

            {/* Sub-tabs */}
            <div className={Style.subTabs}>
              <button
                className={`${Style.subTab} ${pendingSubTab === 'pending' ? Style.subTabActive : ''}`}
                onClick={() => setPendingSubTab('pending')}
              >
                <i className="fa-solid fa-clock"></i> Pending
                {pendingCount > 0 && <span className={Style.tabBadge}>{pendingCount}</span>}
              </button>
              <button
                className={`${Style.subTab} ${pendingSubTab === 'rejected' ? Style.subTabActive : ''}`}
                onClick={() => setPendingSubTab('rejected')}
              >
                <i className="fa-solid fa-ban"></i> Rejected
                {rejectedCount > 0 && <span className={Style.tabBadge}>{rejectedCount}</span>}
              </button>
            </div>

            {approveMsg && (
              <div className={`${Style.errorBanner} ${approveMsg.type === 'success' ? Style.successBanner : ''}`}>
                <i className={`fa-solid ${approveMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                {' '}{approveMsg.text}
                <button className={Style.clearSearch} onClick={() => setApproveMsg(null)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            {pendingError && (
              <div className={Style.errorBanner}>
                <i className="fa-solid fa-triangle-exclamation"></i> {pendingError}
                <button onClick={fetchPendingDoctors} className={Style.retryBtn}>
                  <i className="fa-solid fa-rotate-right"></i> Retry
                </button>
              </div>
            )}

            {/* Pending sub-tab */}
            {pendingSubTab === 'pending' && (
              <div className={Style.tableContainer}>
                {pendingLoading ? (
                  <div className={Style.loadingWrap}>
                    <i className="fa-solid fa-spinner fa-spin"></i> Loading pending doctors…
                  </div>
                ) : (
                  <table className={Style.table}>
                    <thead>
                      <tr className={Style.theadRow}>
                        <th className={Style.th}>Doctor</th>
                        <th className={Style.th}>Email</th>
                        <th className={Style.th}>Specialization</th>
                        <th className={Style.th}>Submitted</th>
                        <th className={Style.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDocs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={Style.emptyRow}>
                            <i className="fa-solid fa-circle-check" style={{ color: '#22c55e', marginRight: 8 }}></i>
                            No pending approvals.
                          </td>
                        </tr>
                      ) : (
                        pendingDocs.map((doc, idx) => {
                          const did = resolveDoctorId(doc)
                          return (
                            <tr key={did ?? idx} className={Style.tr}>
                              <td className={Style.td}>
                                <div className={Style.nameCell}>
                                  <div className={avatarClasses[idx % avatarClasses.length]}>
                                    {getAvatarLetter(doc)}
                                  </div>
                                  <div>
                                    <p className={Style.userName}>{doc?.fullName ?? doc?.name ?? '—'}</p>
                                    <p className={Style.userId}>#{did ?? idx + 1}</p>
                                  </div>
                                </div>
                              </td>
                              <td className={Style.td}>
                                <span className={Style.emailCell}>{doc?.email ?? '—'}</span>
                              </td>
                              <td className={Style.td}>
                                <span className={Style.detailValue}>
                                  {doc?.specialization ?? doc?.specialty ?? '—'}
                                </span>
                              </td>
                              <td className={Style.td}>
                                <span className={Style.detailValue}>{formatDate(doc?.createdAt)}</span>
                              </td>
                              <td className={Style.td}>
                                <div className={Style.actions}>
                                  <button
                                    className={`${Style.actionBtn} ${Style.activateBtn}`}
                                    title="Approve"
                                    disabled={approvingId === did}
                                    onClick={() => approveDoctor(doc, true, '')}
                                  >
                                    {approvingId === did
                                      ? <i className="fa-solid fa-spinner fa-spin"></i>
                                      : <><i className="fa-solid fa-circle-check"></i> Approve</>}
                                  </button>
                                  <button
                                    className={`${Style.actionBtn} ${Style.deactivateBtn}`}
                                    title="Reject"
                                    disabled={approvingId === did}
                                    onClick={() => {
                                      const reason = window.prompt('Rejection reason (optional):') ?? ''
                                      approveDoctor(doc, false, reason)
                                    }}
                                  >
                                    <i className="fa-solid fa-ban"></i> Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Rejected sub-tab */}
            {pendingSubTab === 'rejected' && (
              <div className={Style.tableContainer}>
                <table className={Style.table}>
                  <thead>
                    <tr className={Style.theadRow}>
                      <th className={Style.th}>Doctor</th>
                      <th className={Style.th}>Email</th>
                      <th className={Style.th}>Role</th>
                      <th className={Style.th}>Joined</th>
                      <th className={Style.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={Style.emptyRow}>No rejected doctors.</td>
                      </tr>
                    ) : (
                      rejectedDocs.map((doc, idx) => {
                        const did = resolveDoctorId(doc) ?? resolveUserId(doc)
                        return (
                          <tr key={did ?? idx} className={Style.tr}>
                            <td className={Style.td}>
                              <div className={Style.nameCell}>
                                <div className={avatarClasses[idx % avatarClasses.length]}>
                                  {getAvatarLetter(doc)}
                                </div>
                                <div>
                                  <p className={Style.userName}>{doc?.fullName ?? doc?.name ?? '—'}</p>
                                  <p className={Style.userId}>#{did ? did.toString().slice(0, 8) : idx + 1}</p>
                                </div>
                              </div>
                            </td>
                            <td className={Style.td}>
                              <span className={Style.emailCell}>{doc?.email ?? '—'}</span>
                            </td>
                            <td className={Style.td}>
                              <span className={`${Style.roleBadge} ${Style.roleDoctor}`}>
                                <i className="fa-solid fa-user-doctor"></i> Doctor
                              </span>
                            </td>
                            <td className={Style.td}>
                              <span className={Style.detailValue}>{formatDate(doc?.createdAt)}</span>
                            </td>
                            <td className={Style.td}>
                              <button
                                className={`${Style.actionBtn} ${Style.activateBtn}`}
                                title="Re-approve"
                                disabled={approvingId === did}
                                onClick={() => approveDoctor(doc, true, '')}
                              >
                                {approvingId === did
                                  ? <i className="fa-solid fa-spinner fa-spin"></i>
                                  : <><i className="fa-solid fa-rotate-left"></i> Re-approve</>}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ Tab: User Detail ══ */}
        {activeTab === 'detail' && selectedUser && (() => {
          const u        = selectedUser
          const uid      = resolveUserId(u)
          const role     = u?.role ?? u?.roles?.[0] ?? 'Unknown'
          const status   = resolveStatus(u, pendingEmails, rejectedEmails)
          const isActive = status === 'active'
          return (
            <div className={Style.detailSection}>
              <button className={Style.backBtn} onClick={() => setActiveTab('list')}>
                <i className="fa-solid fa-arrow-left"></i> Back to Users
              </button>

              {detailLoading && (
                <div className={Style.loadingWrap}>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading full profile…
                </div>
              )}
              {detailError && (
                <div className={Style.errorBanner}>
                  <i className="fa-solid fa-triangle-exclamation"></i> {detailError}
                  {uid && (
                    <button onClick={() => fetchUserDetail(uid)} className={Style.retryBtn}>
                      <i className="fa-solid fa-rotate-right"></i> Retry
                    </button>
                  )}
                </div>
              )}
              {statusMsg && (
                <div className={`${Style.errorBanner} ${statusMsg.type === 'success' ? Style.successBanner : ''}`}>
                  <i className={`fa-solid ${statusMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                  {' '}{statusMsg.text}
                  <button className={Style.clearSearch} onClick={() => setStatusMsg(null)}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}

              <div className={Style.detailGrid}>
                <div className={Style.detailCard}>
                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}><i className="fa-solid fa-user"></i></div>
                    <h3 className={Style.detailCardTitle}>User Info</h3>
                  </div>
                  <div className={Style.detailRows}>
                    {[
                      { label: 'Name',    value: u?.fullName ?? u?.name ?? '—' },
                      { label: 'User ID', value: uid ?? '—' },
                      { label: 'Email',   value: u?.email ?? '—' },
                      { label: 'Phone',   value: u?.phoneNumber ?? '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className={Style.detailRow}>
                        <span className={Style.detailLabel}>{label}</span>
                        <span className={Style.detailValue}>{value}</span>
                      </div>
                    ))}
                    <div className={Style.detailRow}>
                      <span className={Style.detailLabel}>Role</span>
                      <span className={`${Style.roleBadge} ${getRoleBadgeClass(role)}`}>
                        <i className={getRoleIcon(role)}></i> {role}
                      </span>
                    </div>
                    <div className={Style.detailRow}>
                      <span className={Style.detailLabel}>Status</span>
                      <StatusBadge user={u} />
                    </div>
                    {u?.createdAt && (
                      <div className={Style.detailRow}>
                        <span className={Style.detailLabel}>Joined</span>
                        <span className={Style.detailValue}>{formatDate(u.createdAt)}</span>
                      </div>
                    )}
                    {u?.lastLoginAt && (
                      <div className={Style.detailRow}>
                        <span className={Style.detailLabel}>Last Login</span>
                        <span className={Style.detailValue}>{formatDate(u.lastLoginAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={Style.detailCard}>
                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}><i className="fa-solid fa-sliders"></i></div>
                    <h3 className={Style.detailCardTitle}>Update Status</h3>
                  </div>

                  {status === 'pending' && (
                    <div className={Style.warningBanner} style={{ marginBottom: 16 }}>
                      <i className="fa-solid fa-clock"></i>&nbsp;
                      This doctor is awaiting approval. Use the Doctor Approvals tab to approve or reject.
                    </div>
                  )}
                  {status === 'rejected' && (
                    <div className={Style.warningBanner} style={{ marginBottom: 16 }}>
                      <i className="fa-solid fa-ban"></i>&nbsp;
                      This doctor was rejected. You can re-approve them from the Doctor Approvals tab.
                    </div>
                  )}

                  <p className={Style.statusDesc}>
                    Change this user's account status. Deactivating will block their access immediately.
                  </p>
                  <div className={Style.statusBtnsGroup}>
                    <button
                      className={`${Style.statusGroupBtn} ${Style.statusActivate}`}
                      disabled={statusLoading || isActive || !uid || status === 'pending'}
                      onClick={() => updateStatus(u, true)}
                    >
                      <div className={Style.statusBtnLeft}>
                        <div className={Style.statusBtnIcon} style={{ background: '#dcfce7', color: '#166534' }}>
                          {statusLoading
                            ? <i className="fa-solid fa-spinner fa-spin"></i>
                            : <i className="fa-solid fa-circle-check"></i>}
                        </div>
                        <div>
                          <p className={Style.statusBtnTitle}>Activate</p>
                          <p className={Style.statusBtnSub}>Grant full access</p>
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                    </button>
                    <button
                      className={`${Style.statusGroupBtn} ${Style.statusDeactivate}`}
                      disabled={statusLoading || !isActive || !uid}
                      onClick={() => updateStatus(u, false)}
                    >
                      <div className={Style.statusBtnLeft}>
                        <div className={Style.statusBtnIcon} style={{ background: '#fee2e2', color: '#991b1b' }}>
                          {statusLoading
                            ? <i className="fa-solid fa-spinner fa-spin"></i>
                            : <i className="fa-solid fa-ban"></i>}
                        </div>
                        <div>
                          <p className={Style.statusBtnTitle}>Deactivate</p>
                          <p className={Style.statusBtnSub}>Block account access</p>
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}