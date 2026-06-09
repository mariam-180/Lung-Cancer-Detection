import React, { useEffect, useState, useCallback } from 'react';
import Style from './Appointments.module.css';

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor/appointments';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Cancelled', 'Completed'];

const STATUS_COLORS = {
  Pending:   { bg: '#fef9c3', color: '#854d0e' },
  Confirmed: { bg: '#dcfce7', color: '#166534' },
  Cancelled: { bg: '#fee2e2', color: '#991b1b' },
  Completed: { bg: '#dbeafe', color: '#1e40af' },
};

const STATUS_EMOJI = { Pending: '⏳', Confirmed: '✅', Cancelled: '❌', Completed: '🏁' };
const STATUS_DESC = {
  Pending:   'Awaiting confirmation',
  Confirmed: 'Appointment confirmed',
  Cancelled: 'Mark as cancelled',
  Completed: 'Visit completed',
};

const SORT_OPTIONS = [
  { label: 'Date',         value: 'date' },
  { label: 'Patient Name', value: 'patientName' },
  { label: 'Status',       value: 'status' },
];

const avatarPalette = ['#5282d4', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];
const avatarColor = (name) => avatarPalette[(name || 'P').charCodeAt(0) % avatarPalette.length];

function badgeStyle(status) {
  return {
    background: STATUS_COLORS[status]?.bg || '#f1f5f9',
    color: STATUS_COLORS[status]?.color || '#475569',
  };
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
}

function formatDuration(dur) {
  if (!dur) return '—';
  try {
    const [h, m] = dur.split(':').map(Number);
    if (h > 0) return `${h}h ${m > 0 ? m + ' min' : ''}`.trim();
    return `${m} min`;
  } catch { return dur; }
}

// RULES:
// - Once changed away from Pending, cannot go back to Pending
// - Once Completed or Cancelled, nothing can be changed
function isStatusAllowed(currentStatus, targetStatus) {
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') return false;
  if (targetStatus === 'Pending' && currentStatus !== 'Pending') return false;
  return true;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(3);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [isDescending, setIsDescending] = useState(true);

  const [selected, setSelected] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [notes, setNotes] = useState('');

  const token = localStorage.getItem('token');

  // ✅ HANDLE BROWSER BACK BUTTON - PREVENT GOING TO LOGIN
  useEffect(() => {
    const handlePopState = (event) => {
      // If we're on detail view, go back to list
      if (selected) {
        event.preventDefault();
        setSelected(null);
        setStatusError('');
        setStatusSuccess('');
        // Push state to prevent going back to login
        window.history.pushState({ page: 'appointments-list' }, '', '');
      }
    };

    // Add event listener
    window.addEventListener('popstate', handlePopState);

    // Push initial state when component mounts (list view)
    if (!selected) {
      window.history.pushState({ page: 'appointments-list' }, '', '');
    }

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selected]);

  // ✅ PUSH STATE WHEN ENTERING DETAIL VIEW
  useEffect(() => {
    if (selected) {
      window.history.pushState({ page: 'appointments-detail' }, '', '');
    }
  }, [selected]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPageNumber(1);
    }, 450);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    fetchAppointments();
  }, [pageNumber, debouncedSearch, sortBy, isDescending]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: sortBy,
      IsDescending: isDescending,
    });
    if (debouncedSearch) params.append('SearchTerm', debouncedSearch);
    return `${BASE_URL}?${params.toString()}`;
  }, [pageNumber, pageSize, debouncedSearch, sortBy, isDescending]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(buildUrl(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = await res.json();
      const d = result?.data;
      if (d && Array.isArray(d.items)) {
        setAppointments(d.items);
        setTotalCount(d.totalCount ?? 0);
        setTotalPages(d.totalPages ?? Math.ceil((d.totalCount ?? 0) / pageSize));
        setHasNextPage(d.hasNextPage ?? false);
        setHasPreviousPage(d.hasPreviousPage ?? false);
      } else {
        setAppointments([]);
        setTotalCount(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!selected || !pendingStatus) return;
    if (pendingStatus === selected.status) return;
    if (!isStatusAllowed(selected.status, pendingStatus)) {
      setStatusError('This status change is not allowed');
      return;
    }

    try {
      setStatusLoading(true);
      setStatusError('');
      setStatusSuccess('');

      const params = new URLSearchParams({ status: pendingStatus });
      if (notes.trim()) params.append('notes', notes.trim());

      const url = `${BASE_URL}/${selected.id}/status?${params.toString()}`;
      console.log('Updating status with PUT:', url);

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Error ${res.status}`);
      }

      const result = await res.json();
      console.log('Update result:', result);

      if (result.success) {
        setAppointments(prev =>
          prev.map(a => (a.id === selected.id ? { ...a, status: pendingStatus } : a))
        );
        setStatusSuccess(`Status updated to "${pendingStatus}"`);

        setTimeout(() => {
          setSelected(null);
          setStatusSuccess('');
          fetchAppointments();
        }, 1500);
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      setStatusError('Failed to update status: ' + err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const openDetail = (appt) => {
    setSelected(appt);
    setPendingStatus(appt.status || 'Pending');
    setNotes('');
    setStatusError('');
    setStatusSuccess('');
  };

  const goBack = () => {
    setSelected(null);
    setStatusError('');
    setStatusSuccess('');
    // Go back in history but stay on appointments page
    window.history.back();
  };

  // ─── DETAIL VIEW ───────────────────────────────────────────
  if (selected) {
    const isLocked = selected.status === 'Completed' || selected.status === 'Cancelled';

    return (
      <div className={Style.wrapper}>
        <div className={Style.maindiv}>

          <button className={Style.backBtn} onClick={goBack}>
            ← Back to Appointments
          </button>

          <div className={Style.detailSection}>

            <div className={Style.topBar} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  className={Style.avatar}
                  style={{
                    background: `linear-gradient(135deg, ${avatarColor(selected.patientName)}, ${avatarColor(selected.patientName)}aa)`,
                    width: 56, height: 56, fontSize: '1.4rem', borderRadius: 16,
                  }}
                >
                  {(selected.patientName || 'P').charAt(0)}
                </div>
                <div>
                  <h2 className={Style.title}>{selected.patientName || 'Unknown Patient'}</h2>
                  <p className={Style.subtitle}>{selected.reason || 'No reason provided'}</p>
                </div>
              </div>
              <span className={Style.statusBadge} style={badgeStyle(selected.status)}>
                {selected.status || 'Unknown'}
              </span>
            </div>

            <div className={Style.detailGrid}>

              {/* Info card */}
              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}>📅</div>
                  <h3 className={Style.detailCardTitle}>Appointment Details</h3>
                </div>
                <div className={Style.detailRows}>
                  {[
                    ['Patient',  selected.patientName                   || '—'],
                    ['Doctor',   selected.doctorName                    || '—'],
                    ['Date',     formatDate(selected.appointmentDate)       ],
                    ['Time',     formatTime(selected.appointmentDate)       ],
                    ['Reason',   selected.reason                        || '—'],
                    ['Status',   selected.status                        || '—'],
                  ].map(([label, value]) => (
                    <div className={Style.detailRow} key={label}>
                      <span className={Style.detailLabel}>{label}</span>
                      <span className={Style.detailValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status update card */}
              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}>🔄</div>
                  <h3 className={Style.detailCardTitle}>Update Status</h3>
                </div>

                {isLocked ? (
                  <p className={Style.statusDesc} style={{ color: '#991b1b', fontWeight: 600 }}>
                    🔒 This appointment is <strong>{selected.status}</strong> and cannot be changed.
                  </p>
                ) : (
                  <p className={Style.statusDesc}>Select a new status and optionally add notes.</p>
                )}

                <div className={Style.statusBtnsGroup}>
                  {STATUS_OPTIONS.map((s) => {
                    const allowed  = isStatusAllowed(selected.status, s);
                    const isActive = pendingStatus === s;
                    return (
                      <button
                        key={s}
                        className={Style.statusGroupBtn}
                        disabled={!allowed}
                        title={
                          !allowed
                            ? s === 'Pending'
                              ? 'Cannot revert to Pending'
                              : `Locked as ${selected.status}`
                            : ''
                        }
                        style={{
                          ...(isActive && allowed
                            ? { borderColor: STATUS_COLORS[s]?.color, background: STATUS_COLORS[s]?.bg }
                            : {}),
                          opacity: !allowed ? 0.4 : 1,
                          cursor: !allowed ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => { if (allowed) setPendingStatus(s); }}
                      >
                        <div className={Style.statusBtnLeft}>
                          <div className={Style.statusBtnIcon} style={{ background: STATUS_COLORS[s]?.bg }}>
                            {!allowed ? '🔒' : STATUS_EMOJI[s]}
                          </div>
                          <div>
                            <p className={Style.statusBtnTitle}>{s}</p>
                            <p className={Style.statusBtnSub}>
                              {!allowed
                                ? s === 'Pending' ? 'Cannot revert to Pending' : 'No further changes allowed'
                                : STATUS_DESC[s]}
                            </p>
                          </div>
                        </div>
                        {isActive && allowed && (
                          <span style={{ fontSize: '0.8rem', color: STATUS_COLORS[s]?.color }}>✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isLocked && (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add any notes about the status change…"
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 12px', borderRadius: 10,
                        border: '1px solid #dde3ed', fontSize: '0.82rem',
                        fontFamily: 'inherit', resize: 'vertical',
                        color: '#1e293b', outline: 'none',
                      }}
                    />
                  </div>
                )}

                {statusError   && <p style={{ color: '#991b1b', fontSize: '0.8rem', marginTop: 8, background: '#fee2e2', padding: 10, borderRadius: 8 }}>{statusError}</p>}
                {statusSuccess && <p style={{ color: '#166534', fontSize: '0.8rem', marginTop: 8, background: '#dcfce7', padding: 10, borderRadius: 8 }}>✅ {statusSuccess} — Redirecting...</p>}

                {!isLocked && (
                  <button
                    className={Style.viewBtn}
                    style={{
                      marginTop: 14, width: '100%', padding: '11px',
                      opacity: (statusLoading || pendingStatus === selected.status) ? 0.6 : 1,
                    }}
                    onClick={updateStatus}
                    disabled={statusLoading || pendingStatus === selected.status}
                  >
                    {statusLoading
                      ? 'Updating…'
                      : pendingStatus === selected.status
                      ? 'No Change'
                      : `Save — Set to ${pendingStatus}`}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className={Style.wrapper}>
      <div className={Style.maindiv}>

        <div className={Style.topBar}>
          <div>
            <h2 className={Style.title}>Appointments</h2>
            <p className={Style.subtitle}>
              {loading
                ? 'Loading…'
                : totalCount > 0
                ? `${totalCount} total · Page ${pageNumber} of ${totalPages}`
                : 'No results'}
            </p>
          </div>
          <button
            className={Style.addBtn}
            onClick={() => { setPageNumber(1); fetchAppointments(); }}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none',
            }}>🔍</span>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search patients…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                border: '1px solid #dde3ed', borderRadius: 12,
                fontSize: '0.83rem', fontFamily: 'inherit',
                color: '#1e293b', outline: 'none', background: 'white',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem',
                }}
              >✕</button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>Sort by</span>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPageNumber(1); }}
              style={{
                padding: '8px 10px', borderRadius: 10,
                border: '1px solid #dde3ed', fontSize: '0.82rem',
                fontFamily: 'inherit', color: '#1e293b',
                background: 'white', cursor: 'pointer', outline: 'none',
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => { setIsDescending(d => !d); setPageNumber(1); }}
              style={{
                padding: '7px 10px', borderRadius: 10,
                border: '1px solid #dde3ed', background: 'white',
                cursor: 'pointer', fontSize: '0.85rem', color: '#4f78c8', fontWeight: 700,
              }}
            >
              {isDescending ? '↓' : '↑'}
            </button>
          </div>
        </div>

        {loading && <div className={Style.messageBox}>Loading appointments…</div>}
        {!loading && error && <div className={Style.errorBox}>{error}</div>}
        {!loading && !error && appointments.length === 0 && (
          <div className={Style.messageBox}>No appointments found</div>
        )}

        {!loading && !error && appointments.length > 0 && (
          <>
            <div className={Style.cards}>
              {appointments.map((appt, index) => (
                <div
                  className={Style.card}
                  key={appt.id || index}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDetail(appt)}
                >
                  <div className={Style.cardTop}>
                    <div
                      className={Style.avatar}
                      style={{
                        background: `linear-gradient(135deg, ${avatarColor(appt.patientName)}, ${avatarColor(appt.patientName)}aa)`,
                      }}
                    >
                      {(appt.patientName || 'P').charAt(0)}
                    </div>
                    <span className={Style.statusBadge} style={badgeStyle(appt.status)}>
                      {appt.status || 'Unknown'}
                    </span>
                  </div>

                  <h3 className={Style.patientName}>{appt.patientName || 'No Name'}</h3>
                  <p className={Style.patientType}>{appt.reason || 'No reason provided'}</p>

                  <div className={Style.divider} />

                  <div className={Style.cardInfo}>
                    <div className={Style.infoItem}>
                      <strong>Date:</strong>
                      <span>{formatDate(appt.appointmentDate)}</span>
                    </div>
                    <div className={Style.infoItem}>
                      <strong>Time:</strong>
                      <span>{formatTime(appt.appointmentDate)}</span>
                    </div>
                    <div className={Style.infoItem}>
                      <strong>Duration:</strong>
                      <span>{formatDuration(appt.duration)}</span>
                    </div>
                  </div>

                  <div className={Style.cardActions}>
                    <button
                      className={Style.viewBtn}
                      onClick={e => { e.stopPropagation(); openDetail(appt); }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 7, padding: '10px 0', borderTop: '1px solid #e2e8f0', marginTop: 32,
              }}>
                <button
                  onClick={() => setPageNumber(p => p - 1)}
                  disabled={!hasPreviousPage}
                  style={{
                    width: 34, height: 34, borderRadius: 9, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: !hasPreviousPage ? 'not-allowed' : 'pointer',
                    opacity: !hasPreviousPage ? 0.35 : 1, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
                  }}
                >‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setPageNumber(page)}
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      border: page === pageNumber ? 'none' : '1px solid #e2e8f0',
                      background: page === pageNumber ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
                      color: page === pageNumber ? '#fff' : '#475569',
                      fontWeight: page === pageNumber ? 700 : 500,
                      fontSize: 13, cursor: 'pointer',
                      boxShadow: page === pageNumber ? '0 4px 12px rgba(37,99,235,0.32)' : 'none',
                    }}
                  >{page}</button>
                ))}

                <button
                  onClick={() => setPageNumber(p => p + 1)}
                  disabled={!hasNextPage}
                  style={{
                    width: 34, height: 34, borderRadius: 9, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: !hasNextPage ? 'not-allowed' : 'pointer',
                    opacity: !hasNextPage ? 0.35 : 1, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
                  }}
                >›</button>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', marginTop: 12 }}>
              Showing {appointments.length} of {totalCount} appointments
            </p>
          </>
        )}
{/* PAGINATION - Always show for testing */}
{/* <div style={{
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '7px',
  padding: '10px 0',
  borderTop: '1px solid #e2e8f0',
  marginTop: 32,
}}>
   Previous button *
  <button
    onClick={() => setPageNumber(p => p - 1)}
    disabled={!hasPreviousPage}
    style={{
      width: '34px',
      height: '34px',
      borderRadius: '9px',
      border: '1px solid #e2e8f0',
      background: '#fff',
      cursor: !hasPreviousPage ? 'not-allowed' : 'pointer',
      opacity: !hasPreviousPage ? 0.35 : 1,
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b',
    }}
  >
    ‹
  </button>

  {/* Page numbers
  {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
    <button
      key={page}
      onClick={() => setPageNumber(page)}
      style={{
        width: '34px',
        height: '34px',
        borderRadius: '9px',
        border: page === pageNumber ? 'none' : '1px solid #e2e8f0',
        background: page === pageNumber
          ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
          : '#fff',
        color: page === pageNumber ? '#fff' : '#475569',
        fontWeight: page === pageNumber ? '700' : '500',
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: page === pageNumber
          ? '0 4px 12px rgba(37,99,235,0.32)'
          : 'none',
      }}
    >
      {page}
    </button>
  ))}

  {/* Next button
  <button
    onClick={() => setPageNumber(p => p + 1)}
    disabled={!hasNextPage}
    style={{
      width: '34px',
      height: '34px',
      borderRadius: '9px',
      border: '1px solid #e2e8f0',
      background: '#fff',
      cursor: !hasNextPage ? 'not-allowed' : 'pointer',
      opacity: !hasNextPage ? 0.35 : 1,
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b',
    }}
  >
    ›
  </button>
</div> */}
      </div>
    </div>
  );
}