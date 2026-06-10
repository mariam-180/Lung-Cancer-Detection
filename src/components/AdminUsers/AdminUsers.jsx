import React, { useState, useEffect, useCallback, useRef } from 'react'
import Style from './AdminUsers.module.css'

const BASE      = 'https://lungcancer.runasp.net/api/Admin'
const USERS_API = `${BASE}/users`
const DOCS_API  = `${BASE}/doctors`

const POLL_INTERVAL = 5000
const REFRESH_EVENT = 'adminDataChanged'

const getToken    = () => localStorage.getItem('token')
const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
})

const notifyDashboard = () => window.dispatchEvent(new CustomEvent(REFRESH_EVENT))

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
    data.count      ?? data.totalRecords ??
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

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function Toast({ toasts, removeToast }) {
  return (
    <div className={Style.toastContainer}>
      {toasts.map(t => (
        <div key={t.id} className={`${Style.toast} ${Style['toast_' + t.type]}`}>
          <div className={Style.toastIconWrap}>
            <i className={
              t.type === 'success' ? 'fa-solid fa-circle-check' :
              t.type === 'error'   ? 'fa-solid fa-circle-xmark' :
              t.type === 'warning' ? 'fa-solid fa-triangle-exclamation' :
              'fa-solid fa-circle-info'
            }></i>
          </div>
          <div className={Style.toastBody}>
            {t.title && <p className={Style.toastTitle}>{t.title}</p>}
            <p className={Style.toastMsg}>{t.message}</p>
          </div>
          <button className={Style.toastClose} onClick={() => removeToast(t.id)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <div className={Style.toastProgress} style={{ animationDuration: `${t.duration}ms` }} />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   CONFIRM MODAL
───────────────────────────────────────── */
function ConfirmModal({ config, onConfirm, onCancel }) {
  if (!config) return null
  const icons = {
    danger:  { icon: 'fa-solid fa-trash',                bg: '#fef2f2', color: '#ef4444' },
    warning: { icon: 'fa-solid fa-triangle-exclamation', bg: '#fffbeb', color: '#f59e0b' },
    info:    { icon: 'fa-solid fa-circle-info',          bg: '#eff6ff', color: '#3b82f6' },
  }
  const s = icons[config.variant ?? 'danger']
  return (
    <div className={Style.modalOverlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className={Style.modalBox}>
        <div className={Style.modalIcon} style={{ background: s.bg, color: s.color }}>
          <i className={s.icon}></i>
        </div>
        <h3 className={Style.modalTitle}>{config.title}</h3>
        <p  className={Style.modalBody}>{config.body}</p>
        <div className={Style.modalActions}>
          <button className={Style.modalCancelBtn} onClick={onCancel} disabled={config.loading}>
            {config.cancelLabel ?? 'Cancel'}
          </button>
          <button
            className={`${Style.modalConfirmBtn} ${Style['modalConfirm_' + (config.variant ?? 'danger')]}`}
            onClick={onConfirm}
            disabled={config.loading}
          >
            {config.loading
              ? <><i className="fa-solid fa-spinner fa-spin"></i> {config.loadingLabel ?? 'Processing…'}</>
              : <><i className={s.icon}></i> {config.confirmLabel ?? 'Confirm'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   REJECT MODAL
───────────────────────────────────────── */
function RejectModal({ config, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (config) setReason('') }, [config])
  if (!config) return null
  return (
    <div className={Style.modalOverlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className={Style.modalBox}>
        <div className={Style.modalIcon} style={{ background: '#fffbeb', color: '#f59e0b' }}>
          <i className="fa-solid fa-ban"></i>
        </div>
        <h3 className={Style.modalTitle}>Reject Doctor</h3>
        <p  className={Style.modalBody}>
          You are about to reject <strong>{config.name}</strong>. You may optionally provide a reason.
        </p>
        <div className={Style.rejectInputWrap}>
          <label className={Style.rejectLabel}>
            <i className="fa-solid fa-pen-to-square"></i>
            Rejection reason
            <span className={Style.optionalTag}>optional</span>
          </label>
          <textarea
            className={Style.rejectTextarea}
            placeholder="e.g. Incomplete credentials, invalid license number…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>
        <div className={Style.modalActions}>
          <button className={Style.modalCancelBtn} onClick={onCancel} disabled={config.loading}>Cancel</button>
          <button
            className={`${Style.modalConfirmBtn} ${Style.modalConfirm_danger}`}
            onClick={() => onConfirm(reason)}
            disabled={config.loading}
          >
            {config.loading
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Rejecting…</>
              : <><i className="fa-solid fa-ban"></i> Reject Doctor</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AdminUsers() {
  const [activeTab,    setActiveTab]    = useState('list')
  const [roleFilter,   setRoleFilter]   = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)

  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize]                  = useState(4)
  const [totalCount, setTotalCount] = useState(0)

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [pendingDocs,    setPendingDocs]    = useState([])
  const [rejectedDocs,   setRejectedDocs]   = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError,   setPendingError]   = useState(null)
  const [approvingId,    setApprovingId]    = useState(null)

  const [pendingEmails,  setPendingEmails]  = useState(new Set())
  const [rejectedEmails, setRejectedEmails] = useState(new Set())
  const [pendingSubTab,  setPendingSubTab]  = useState('pending')

  /* toast */
  const [toasts, setToasts] = useState([])
  const toastCounter = useRef(0)
  const addToast = useCallback((type, message, title = '', duration = 4500) => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, type, message, title, duration }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration + 400)
  }, [])
  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id))

  /* modals */
  const [confirmModal, setConfirmModal] = useState(null)
  const [rejectModal,  setRejectModal]  = useState(null)

  /*
    ── REFS — always current, never stale in closures ──
    This is the key fix: fetchUsers reads ALL params from refs so it
    has a stable [] dependency and NEVER gets recreated.
    No more double-fetch on page change.
  */
  const pageNumberRef  = useRef(1)
  const pageSizeRef    = useRef(4)
  const searchTermRef  = useRef('')
  const roleFilterRef  = useRef('all')
  const activeTabRef   = useRef('list')
  const pollTimerRef   = useRef(null)

  // keep refs in sync on every render
  pageNumberRef.current = pageNumber
  pageSizeRef.current   = pageSize
  searchTermRef.current = searchTerm
  roleFilterRef.current = roleFilter
  activeTabRef.current  = activeTab

  /* helpers */
  const getRoleBadgeClass = r => {
    const v = (r ?? '').toLowerCase()
    if (v === 'doctor')  return Style.roleDoctor
    if (v === 'patient') return Style.rolePatient
    if (v === 'admin')   return Style.roleAdmin
    return ''
  }
  const getRoleIcon = r => {
    const v = (r ?? '').toLowerCase()
    if (v === 'doctor')  return 'fa-solid fa-user-doctor'
    if (v === 'patient') return 'fa-solid fa-user'
    if (v === 'admin')   return 'fa-solid fa-shield'
    return 'fa-solid fa-user'
  }
  const getAvatarLetter = u =>
    ((u?.fullName ?? u?.name ?? u?.email ?? '?')[0] ?? '?').toUpperCase()
  const avatarClasses = [Style.avatar, Style.avatar2, Style.avatar3, Style.avatar4, Style.avatar5]
  const formatDate = d => d
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

  /*
    ── fetchUsers ─────────────────────────────────────────────────────────
    Reads everything from refs → stable [] deps → created ONCE, never
    recreated → no cascade re-renders → no double fetch.

    silent=true  → skip spinner (background poll)
    silent=false → show spinner (user-triggered navigation)
  */
  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const params = new URLSearchParams({
        PageNumber: pageNumberRef.current,
        PageSize:   pageSizeRef.current,
      })
      if (searchTermRef.current)             params.append('SearchTerm', searchTermRef.current)
      if (roleFilterRef.current !== 'all')   params.append('role', roleFilterRef.current)

      const res  = await fetch(`${USERS_API}?${params}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data  = await res.json()
      const list  = extractList(data)
      const total = extractTotal(data)
      setUsers(list)
      setTotalCount(total || list.length)
    } catch (err) {
      if (!silent) setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, []) // ← truly stable

  /*
    ── fetchPendingDoctors — also stable ──
  */
  const fetchPendingDoctors = useCallback(async (silent = false) => {
    if (!silent) { setPendingLoading(true); setPendingError(null) }
    try {
      const res  = await fetch(`${DOCS_API}/pending?PageNumber=1&PageSize=200`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const data = await res.json()
      const list = extractList(data)
      setPendingDocs(list)
      setPendingEmails(new Set(list.map(d => (d?.email ?? '').toLowerCase()).filter(Boolean)))
    } catch (err) {
      if (!silent) { setPendingError(err.message); setPendingDocs([]) }
    } finally {
      if (!silent) setPendingLoading(false)
    }
  }, []) // ← truly stable

  /* silent refresh for polling */
  const silentRefresh = useCallback(() => {
    const tab = activeTabRef.current
    if (tab === 'list' || tab === 'detail') {
      fetchUsers(true)
    } else if (tab === 'pending') {
      fetchPendingDoctors(true)
      fetchUsers(true)
    }
  }, [fetchUsers, fetchPendingDoctors])

  /* polling */
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollTimerRef.current = setInterval(silentRefresh, POLL_INTERVAL)
  }, [silentRefresh])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
  }, [])

  /* ── mount: initial load + start polling ── */
  useEffect(() => {
    fetchUsers(false)
    fetchPendingDoctors(false)
    startPolling()
    return stopPolling
  }, []) // eslint-disable-line

  /*
    ── PAGE CHANGE → fetch immediately (no spinner flicker) ──
    Uses fetchUsers(false) so spinner shows, giving instant feedback.
    Because fetchUsers is stable, this effect only fires when pageNumber
    actually changes — never on unrelated re-renders.
  */
  useEffect(() => {
    fetchUsers(false)
  }, [pageNumber]) // eslint-disable-line

  /*
    ── FILTER / SEARCH CHANGE → reset to page 1 then fetch ──
    We set pageNumber to 1. The pageNumber effect above fires and fetches.
    But if pageNumber is already 1, that effect won't re-fire, so we
    call fetchUsers directly here too.
  */
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (pageNumber !== 1) {
      setPageNumber(1) // triggers the pageNumber effect
    } else {
      fetchUsers(false) // pageNumber was already 1, fetch directly
    }
  }, [roleFilter, searchTerm]) // eslint-disable-line

  /* re-fetch pending when switching to that tab */
  useEffect(() => {
    if (activeTab === 'pending') fetchPendingDoctors(false)
  }, [activeTab]) // eslint-disable-line

  /* listen for external mutations */
  useEffect(() => {
    const handle = () => { fetchUsers(true); fetchPendingDoctors(true) }
    window.addEventListener(REFRESH_EVENT, handle)
    return () => window.removeEventListener(REFRESH_EVENT, handle)
  }, [fetchUsers, fetchPendingDoctors])

  /* pause/resume polling on browser tab visibility */
  useEffect(() => {
    const handle = () => {
      if (document.hidden) { stopPolling(); return }
      silentRefresh()
      startPolling()
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [silentRefresh, startPolling, stopPolling])

  /* derived rejected docs */
  useEffect(() => {
    const rejected = users.filter(u => {
      const role  = (u?.role ?? '').toLowerCase()
      const email = (u?.email ?? '').toLowerCase()
      return role === 'doctor' && !(u?.isActive ?? false) && !pendingEmails.has(email)
    })
    setRejectedDocs(rejected)
    setRejectedEmails(new Set(rejected.map(u => (u?.email ?? '').toLowerCase()).filter(Boolean)))
  }, [users, pendingEmails])

  const totalPages = Math.ceil(totalCount / pageSize)

  /* ── GET /users/{id} ── */
  const fetchUserDetail = async uid => {
    if (!uid) return
    setDetailLoading(true); setDetailError(null)
    try {
      const res  = await fetch(`${USERS_API}/${uid}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const json = await res.json()
      setSelectedUser(json?.data ?? json?.user ?? json)
    } catch (err) { setDetailError(err.message) }
    finally { setDetailLoading(false) }
  }

  const handleViewDetail = async user => {
    const uid = resolveUserId(user)
    setSelectedUser(user); setActiveTab('detail')
    if (uid) await fetchUserDetail(uid)
    else setDetailError('User ID not found — showing cached data only.')
  }

  /* ── PUT /users/{id}/status ── */
  const updateStatus = async (user, newIsActive) => {
    const uid = resolveUserId(user)
    if (!uid) { addToast('error', 'Cannot update: user ID missing.', 'Update Failed'); return }
    setStatusLoading(true)
    try {
      const res = await fetch(`${USERS_API}/${uid}/status`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isActive: newIsActive }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      addToast(
        'success',
        `${user?.fullName ?? user?.name ?? 'User'} has been ${newIsActive ? 'activated' : 'deactivated'}.`,
        newIsActive ? 'Account Activated' : 'Account Deactivated'
      )
      notifyDashboard()
      const email = (user?.email ?? selectedUser?.email ?? '').toLowerCase()
      if (email) {
        setPendingEmails(p  => { const n = new Set(p); n.delete(email); return n })
        setRejectedEmails(p => { const n = new Set(p); n.delete(email); return n })
      }
      const patch = u => resolveUserId(u) === uid ? { ...u, isActive: newIsActive } : u
      setUsers(p => p.map(patch))
      if (resolveUserId(selectedUser) === uid)
        setSelectedUser(p => ({ ...p, isActive: newIsActive }))
    } catch (err) { addToast('error', err.message, 'Update Failed') }
    finally { setStatusLoading(false) }
  }

  /* ── DELETE /users/{id} ── */
  const deleteUser = async user => {
    const uid = resolveUserId(user)
    if (!uid) { addToast('error', 'Cannot delete: user ID missing.', 'Delete Failed'); return }
    setConfirmModal(p => ({ ...p, loading: true }))
    setDeleteLoading(true)
    try {
      const res = await fetch(`${USERS_API}/${uid}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      const json = await res.json()
      if (json?.success === false) throw new Error(json?.message ?? 'Delete failed.')
      setConfirmModal(null)
      addToast('success', `${user?.fullName ?? user?.name ?? 'User'} has been permanently deleted.`, 'User Deleted')
      notifyDashboard()
      setUsers(p => p.filter(u => resolveUserId(u) !== uid))
      setTotalCount(p => Math.max(0, p - 1))
      if (activeTab === 'detail' && resolveUserId(selectedUser) === uid) {
        setSelectedUser(null); setActiveTab('list')
      }
    } catch (err) { setConfirmModal(null); addToast('error', err.message, 'Delete Failed') }
    finally { setDeleteLoading(false) }
  }

  const openDeleteConfirm = user => {
    setConfirmModal({
      variant:      'danger',
      title:        'Delete User?',
      body:         <span>Are you sure you want to permanently delete <strong>{user?.fullName ?? user?.name ?? user?.email ?? 'this user'}</strong>? This action cannot be undone.</span>,
      confirmLabel: 'Delete',
      loadingLabel: 'Deleting…',
      loading:      false,
      onConfirm:    () => deleteUser(user),
    })
  }

  /* ── POST /doctors/{id}/approve ── */
  const approveDoctor = async (doc, isApproved = true, rejectionReason = '') => {
    const did   = resolveDoctorId(doc) ?? resolveUserId(doc)
    const email = (doc?.email ?? '').toLowerCase()
    const name  = doc?.fullName ?? doc?.name ?? 'This doctor'
    if (!did) { addToast('error', 'Cannot process: doctor ID missing.', 'Action Failed'); return }
    setApprovingId(did); setRejectModal(null)
    try {
      const res = await fetch(`${DOCS_API}/${did}/approve`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ isApproved, rejectionReason }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
      addToast(
        isApproved ? 'success' : 'warning',
        isApproved
          ? `${name} has been approved and can now access the platform.`
          : `${name} has been rejected.${rejectionReason ? ` Reason: "${rejectionReason}"` : ''}`,
        isApproved ? 'Doctor Approved' : 'Doctor Rejected'
      )
      notifyDashboard()
      setPendingDocs(p => p.filter(d => resolveDoctorId(d) !== did))
      setPendingEmails(p => { const n = new Set(p); n.delete(email); return n })
      if (isApproved) setRejectedEmails(p => { const n = new Set(p); n.delete(email); return n })
      await fetchUsers(false)
    } catch (err) { addToast('error', err.message, 'Action Failed') }
    finally { setApprovingId(null) }
  }

  const openRejectModal = doc =>
    setRejectModal({ name: doc?.fullName ?? doc?.name ?? 'this doctor', doc, loading: false })

  const pendingCount  = pendingDocs.length
  const rejectedCount = rejectedDocs.length

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className={Style.wrapper}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmModal
        config={confirmModal}
        onConfirm={() => confirmModal?.onConfirm?.()}
        onCancel={() => !deleteLoading && setConfirmModal(null)}
      />
      <RejectModal
        config={rejectModal}
        onConfirm={reason => approveDoctor(rejectModal.doc, false, reason)}
        onCancel={() => setRejectModal(null)}
      />

      <div className={Style.maindiv}>

        {/* Tabs */}
        <div className={Style.tabs}>
          <button className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`} onClick={() => setActiveTab('list')}>
            <i className="fa-solid fa-users"></i> All Users
          </button>
          <button className={`${Style.tab} ${activeTab === 'pending' ? Style.activeTab : ''}`} onClick={() => setActiveTab('pending')}>
            <i className="fa-solid fa-user-clock"></i> Doctor Approvals
            {(pendingCount + rejectedCount) > 0 && <span className={Style.tabBadge}>{pendingCount + rejectedCount}</span>}
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'detail' ? Style.activeTab : ''}`}
            onClick={() => selectedUser && setActiveTab('detail')}
            disabled={!selectedUser}
          >
            <i className="fa-solid fa-user"></i> User Detail
          </button>
        </div>

        {/* ══ All Users ══ */}
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
              <div className={Style.inlineError}>
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
                <button onClick={() => fetchUsers(false)} className={Style.retryBtn}>
                  <i className="fa-solid fa-rotate-right"></i> Retry
                </button>
              </div>
            )}

            <div className={Style.tableContainer}>
              {loading ? (
                <div className={Style.loadingWrap}><div className={Style.spinner}></div> Loading users…</div>
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
                      <tr><td colSpan={5} className={Style.emptyRow}><i className="fa-solid fa-users-slash"></i>No users found.</td></tr>
                    ) : users.map((user, idx) => {
                      const uid       = resolveUserId(user)
                      const role      = user?.role ?? user?.roles?.[0] ?? 'Unknown'
                      const status    = resolveStatus(user, pendingEmails, rejectedEmails)
                      const isActive  = status === 'active'
                      const canToggle = status !== 'pending'
                      return (
                        <tr key={uid ?? idx} className={Style.tr}>
                          <td className={Style.td}>
                            <div className={Style.nameCell}>
                              <div className={avatarClasses[idx % avatarClasses.length]}>{getAvatarLetter(user)}</div>
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
                          <td className={Style.td}><span className={Style.emailCell}>{user?.email ?? '—'}</span></td>
                          <td className={Style.td}><StatusBadge user={user} /></td>
                          <td className={Style.td}>
                            <div className={Style.actions}>
                              <button className={`${Style.actionBtn} ${Style.viewBtn}`} title="View details" onClick={() => handleViewDetail(user)}>
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
                              <button
                                className={`${Style.actionBtn} ${Style.deleteBtn}`}
                                title="Delete user"
                                disabled={deleteLoading}
                                onClick={() => openDeleteConfirm(user)}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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

        {/* ══ Doctor Approvals ══ */}
        {activeTab === 'pending' && (
          <div className={Style.detailSection}>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Doctor Approvals</h2>
                <p className={Style.subtitle}>{pendingLoading ? 'Loading…' : `${pendingCount} pending · ${rejectedCount} rejected`}</p>
              </div>
              <button className={Style.retryBtn} onClick={() => fetchPendingDoctors(false)}>
                <i className="fa-solid fa-rotate-right"></i> Refresh
              </button>
            </div>

            <div className={Style.subTabs}>
              <button className={`${Style.subTab} ${pendingSubTab === 'pending' ? Style.subTabActive : ''}`} onClick={() => setPendingSubTab('pending')}>
                <i className="fa-solid fa-clock"></i> Pending
                {pendingCount > 0 && <span className={Style.tabBadge}>{pendingCount}</span>}
              </button>
              <button className={`${Style.subTab} ${pendingSubTab === 'rejected' ? Style.subTabActive : ''}`} onClick={() => setPendingSubTab('rejected')}>
                <i className="fa-solid fa-ban"></i> Rejected
                {rejectedCount > 0 && <span className={Style.tabBadge}>{rejectedCount}</span>}
              </button>
            </div>

            {pendingError && (
              <div className={Style.inlineError}>
                <i className="fa-solid fa-triangle-exclamation"></i> {pendingError}
                <button onClick={() => fetchPendingDoctors(false)} className={Style.retryBtn}>
                  <i className="fa-solid fa-rotate-right"></i> Retry
                </button>
              </div>
            )}

            {pendingSubTab === 'pending' && (
              <div className={Style.tableContainer}>
                {pendingLoading ? (
                  <div className={Style.loadingWrap}><div className={Style.spinner}></div> Loading pending doctors…</div>
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
                        <tr><td colSpan={5} className={Style.emptyRow}>No pending approvals.</td></tr>
                      ) : pendingDocs.map((doc, idx) => {
                        const did = resolveDoctorId(doc)
                        return (
                          <tr key={did ?? idx} className={Style.tr}>
                            <td className={Style.td}>
                              <div className={Style.nameCell}>
                                <div className={avatarClasses[idx % avatarClasses.length]}>{getAvatarLetter(doc)}</div>
                                <div>
                                  <p className={Style.userName}>{doc?.fullName ?? doc?.name ?? '—'}</p>
                                  <p className={Style.userId}>#{did ?? idx + 1}</p>
                                </div>
                              </div>
                            </td>
                            <td className={Style.td}><span className={Style.emailCell}>{doc?.email ?? '—'}</span></td>
                            <td className={Style.td}><span className={Style.detailValue}>{doc?.specialization ?? doc?.specialty ?? '—'}</span></td>
                            <td className={Style.td}><span className={Style.detailValue}>{formatDate(doc?.createdAt)}</span></td>
                            <td className={Style.td}>
                              <div className={Style.actions}>
                                <button className={`${Style.actionBtn} ${Style.activateBtn}`} disabled={approvingId === did} onClick={() => approveDoctor(doc, true, '')}>
                                  {approvingId === did ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-circle-check"></i> Approve</>}
                                </button>
                                <button className={`${Style.actionBtn} ${Style.deactivateBtn}`} disabled={approvingId === did} onClick={() => openRejectModal(doc)}>
                                  <i className="fa-solid fa-ban"></i> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

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
                      <tr><td colSpan={5} className={Style.emptyRow}>No rejected doctors.</td></tr>
                    ) : rejectedDocs.map((doc, idx) => {
                      const did = resolveDoctorId(doc) ?? resolveUserId(doc)
                      return (
                        <tr key={did ?? idx} className={Style.tr}>
                          <td className={Style.td}>
                            <div className={Style.nameCell}>
                              <div className={avatarClasses[idx % avatarClasses.length]}>{getAvatarLetter(doc)}</div>
                              <div>
                                <p className={Style.userName}>{doc?.fullName ?? doc?.name ?? '—'}</p>
                                <p className={Style.userId}>#{did ? did.toString().slice(0, 8) : idx + 1}</p>
                              </div>
                            </div>
                          </td>
                          <td className={Style.td}><span className={Style.emailCell}>{doc?.email ?? '—'}</span></td>
                          <td className={Style.td}><span className={`${Style.roleBadge} ${Style.roleDoctor}`}><i className="fa-solid fa-user-doctor"></i> Doctor</span></td>
                          <td className={Style.td}><span className={Style.detailValue}>{formatDate(doc?.createdAt)}</span></td>
                          <td className={Style.td}>
                            <button className={`${Style.actionBtn} ${Style.activateBtn}`} disabled={approvingId === did} onClick={() => approveDoctor(doc, true, '')}>
                              {approvingId === did ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-rotate-left"></i> Re-approve</>}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ User Detail ══ */}
        {activeTab === 'detail' && selectedUser && (() => {
          const u      = selectedUser
          const uid    = resolveUserId(u)
          const role   = u?.role ?? u?.roles?.[0] ?? 'Unknown'
          const status = resolveStatus(u, pendingEmails, rejectedEmails)
          const isActive = status === 'active'
          return (
            <div className={Style.detailSection}>
              <button className={Style.backBtn} onClick={() => setActiveTab('list')}>
                <i className="fa-solid fa-arrow-left"></i> Back to Users
              </button>
              {detailLoading && <div className={Style.loadingWrap} style={{ padding: 24 }}><div className={Style.spinner}></div> Loading full profile…</div>}
              {detailError && (
                <div className={Style.inlineError}>
                  <i className="fa-solid fa-triangle-exclamation"></i> {detailError}
                  {uid && <button onClick={() => fetchUserDetail(uid)} className={Style.retryBtn}><i className="fa-solid fa-rotate-right"></i> Retry</button>}
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
                      <span className={`${Style.roleBadge} ${getRoleBadgeClass(role)}`}><i className={getRoleIcon(role)}></i> {role}</span>
                    </div>
                    <div className={Style.detailRow}>
                      <span className={Style.detailLabel}>Status</span>
                      <StatusBadge user={u} />
                    </div>
                    {u?.createdAt   && <div className={Style.detailRow}><span className={Style.detailLabel}>Joined</span><span className={Style.detailValue}>{formatDate(u.createdAt)}</span></div>}
                    {u?.lastLoginAt && <div className={Style.detailRow}><span className={Style.detailLabel}>Last Login</span><span className={Style.detailValue}>{formatDate(u.lastLoginAt)}</span></div>}
                  </div>
                </div>
                <div className={Style.detailCard}>
                  <div className={Style.detailCardHeader}>
                    <div className={Style.detailIcon}><i className="fa-solid fa-sliders"></i></div>
                    <h3 className={Style.detailCardTitle}>Manage Account</h3>
                  </div>
                  {status === 'pending' && <div className={Style.infoBanner}><i className="fa-solid fa-clock"></i> This doctor is awaiting approval. Use the Doctor Approvals tab.</div>}
                  {status === 'rejected' && <div className={Style.warningBannerInline}><i className="fa-solid fa-ban"></i> This doctor was rejected. Re-approve from the Doctor Approvals tab.</div>}
                  <p className={Style.statusDesc}>Change account status or permanently remove this account.</p>
                  <div className={Style.statusBtnsGroup}>
                    <button className={`${Style.statusGroupBtn} ${Style.statusActivate}`} disabled={statusLoading || isActive || !uid || status === 'pending'} onClick={() => updateStatus(u, true)}>
                      <div className={Style.statusBtnLeft}>
                        <div className={Style.statusBtnIcon} style={{ background: '#dcfce7', color: '#166534' }}>
                          {statusLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-circle-check"></i>}
                        </div>
                        <div><p className={Style.statusBtnTitle}>Activate</p><p className={Style.statusBtnSub}>Grant full access</p></div>
                      </div>
                      <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                    </button>
                    <button className={`${Style.statusGroupBtn} ${Style.statusDeactivate}`} disabled={statusLoading || !isActive || !uid} onClick={() => updateStatus(u, false)}>
                      <div className={Style.statusBtnLeft}>
                        <div className={Style.statusBtnIcon} style={{ background: '#fef3c7', color: '#92400e' }}>
                          {statusLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-ban"></i>}
                        </div>
                        <div><p className={Style.statusBtnTitle}>Deactivate</p><p className={Style.statusBtnSub}>Block account access</p></div>
                      </div>
                      <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                    </button>
                    <button className={`${Style.statusGroupBtn} ${Style.statusDelete}`} disabled={deleteLoading || !uid} onClick={() => openDeleteConfirm(u)}>
                      <div className={Style.statusBtnLeft}>
                        <div className={Style.statusBtnIcon} style={{ background: '#fee2e2', color: '#991b1b' }}>
                          {deleteLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-trash"></i>}
                        </div>
                        <div><p className={Style.statusBtnTitle}>Delete User</p><p className={Style.statusBtnSub}>Permanently remove account</p></div>
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