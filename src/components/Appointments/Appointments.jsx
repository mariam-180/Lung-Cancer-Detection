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

const SORT_OPTIONS = [
  { label: 'Date',         value: 'date' },
  { label: 'Patient Name', value: 'patientName' },
  { label: 'Status',       value: 'status' },
];

const avatarPalette = ['#5282d4', '#a78bfa', '#34d399', '#fb923c', '#f472b6'];
const avatarColor   = (name) => avatarPalette[(name || 'P').charCodeAt(0) % avatarPalette.length];

function badgeStyle(status) {
  return {
    background: STATUS_COLORS[status]?.bg  || '#f1f5f9',
    color:      STATUS_COLORS[status]?.color || '#475569',
  };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Pagination - CHANGED: pageSize from 10 to 2 for testing
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize]                  = useState(5); // ← CHANGED: 10 → 2 to force pagination
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage]           = useState(false);
  const [hasPreviousPage, setHasPreviousPage]   = useState(false);

  // Filters
  const [searchTerm, setSearchTerm]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy]                 = useState('date');
  const [isDescending, setIsDescending]     = useState(true);

  // Detail / Status update
  const [selected, setSelected]           = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError]     = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [notes, setNotes]                 = useState('');

  const token = localStorage.getItem('token');

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPageNumber(1); }, 450);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /* ── fetch on filter / page change ── */
  useEffect(() => { fetchAppointments(); }, [pageNumber, debouncedSearch, sortBy, isDescending]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({
      PageNumber:   pageNumber,
      PageSize:     pageSize,
      SortBy:       sortBy,
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = await res.json();
      
      const d = result?.data;
      if (d && Array.isArray(d.items)) {
        setAppointments(d.items);
        setTotalCount(d.totalCount ?? 0);
        const calculatedPages = d.totalPages ?? Math.ceil((d.totalCount ?? 0) / pageSize);
        setTotalPages(calculatedPages);
        setHasNextPage(d.hasNextPage ?? false);
        setHasPreviousPage(d.hasPreviousPage ?? false);
      } else if (Array.isArray(result)) {
        // Fallback: if API returns array directly
        setAppointments(result);
        setTotalCount(result.length);
        setTotalPages(Math.ceil(result.length / pageSize));
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

  /* ── status update ── */
  const updateStatus = async () => {
    if (!selected || !pendingStatus) return;
    try {
      setStatusLoading(true);
      setStatusError('');
      setStatusSuccess('');
      const params = new URLSearchParams({ status: pendingStatus });
      if (notes) params.append('notes', notes);
      const res = await fetch(`${BASE_URL}/${selected.id}/status?${params.toString()}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setStatusSuccess(`Status updated to "${pendingStatus}"`);
      setSelected(prev => ({ ...prev, status: pendingStatus }));
      setAppointments(prev =>
        prev.map(a => (a.id === selected.id ? { ...a, status: pendingStatus } : a))
      );
    } catch (err) {
      console.error(err);
      setStatusError('Failed to update status. Please try again.');
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

  /* ════════════════════════════════════════
     DETAIL VIEW
  ════════════════════════════════════════ */
  if (selected) {
    const STATUS_EMOJI = { Pending: '⏳', Confirmed: '✅', Cancelled: '❌', Completed: '🏁' };
    const STATUS_DESC  = {
      Pending:   'Awaiting confirmation',
      Confirmed: 'Appointment confirmed',
      Cancelled: 'Mark as cancelled',
      Completed: 'Visit completed',
    };

    return (
      <div className={Style.wrapper}>
        <div className={Style.maindiv}>

          <button className={Style.backBtn} onClick={() => setSelected(null)}>
            ← Back to Appointments
          </button>

          <div className={Style.detailSection}>
            {/* Header */}
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
                  <p className={Style.subtitle}>{selected.appointmentType || 'Appointment'}</p>
                </div>
              </div>
              <span className={Style.statusBadge} style={badgeStyle(selected.status)}>
                {selected.status || 'Unknown'}
              </span>
            </div>

            <div className={Style.detailGrid}>

              {/* Appointment Info */}
              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}>📅</div>
                  <h3 className={Style.detailCardTitle}>Appointment Details</h3>
                </div>
                <div className={Style.detailRows}>
                  {[
                    ['Patient ID', selected.patientId        || '—'],
                    ['Date',       selected.date             || '—'],
                    ['Time',       selected.time             || '—'],
                    ['Type',       selected.appointmentType  || '—'],
                    ['Status',     selected.status           || '—'],
                  ].map(([label, value]) => (
                    <div className={Style.detailRow} key={label}>
                      <span className={Style.detailLabel}>{label}</span>
                      <span className={Style.detailValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update */}
              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}>🔄</div>
                  <h3 className={Style.detailCardTitle}>Update Status</h3>
                </div>

                <p className={Style.statusDesc}>Select a new status and optionally add notes.</p>

                <div className={Style.statusBtnsGroup}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      className={Style.statusGroupBtn}
                      style={
                        pendingStatus === s
                          ? { borderColor: STATUS_COLORS[s]?.color, background: STATUS_COLORS[s]?.bg }
                          : {}
                      }
                      onClick={() => setPendingStatus(s)}
                    >
                      <div className={Style.statusBtnLeft}>
                        <div className={Style.statusBtnIcon} style={{ background: STATUS_COLORS[s]?.bg }}>
                          {STATUS_EMOJI[s]}
                        </div>
                        <div>
                          <p className={Style.statusBtnTitle}>{s}</p>
                          <p className={Style.statusBtnSub}>{STATUS_DESC[s]}</p>
                        </div>
                      </div>
                      {pendingStatus === s && (
                        <span style={{ fontSize: '0.8rem', color: STATUS_COLORS[s]?.color }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Notes */}
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

                {statusError   && <p style={{ color: '#991b1b', fontSize: '0.8rem', marginTop: 8 }}>{statusError}</p>}
                {statusSuccess && <p style={{ color: '#166534', fontSize: '0.8rem', marginTop: 8 }}>{statusSuccess}</p>}

                <button
                  className={Style.viewBtn}
                  style={{ marginTop: 14, width: '100%', padding: '11px', opacity: (statusLoading || pendingStatus === selected.status) ? 0.6 : 1 }}
                  onClick={updateStatus}
                  disabled={statusLoading || pendingStatus === selected.status}
                >
                  {statusLoading
                    ? 'Updating…'
                    : pendingStatus === selected.status
                    ? 'No Change'
                    : `Save — Set to ${pendingStatus}`}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     LIST VIEW
  ════════════════════════════════════════ */
  return (
    <div className={Style.wrapper}>
      <div className={Style.maindiv}>

        {/* Top Bar */}
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

        {/* Search + Sort */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none' }}>
              🔍
            </span>
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
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort by select */}
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

            {/* Direction toggle */}
            <button
              onClick={() => { setIsDescending(d => !d); setPageNumber(1); }}
              title={isDescending ? 'Descending — click for ascending' : 'Ascending — click for descending'}
              style={{
                padding: '7px 10px', borderRadius: 10,
                border: '1px solid #dde3ed', background: 'white',
                cursor: 'pointer', fontSize: '0.85rem', color: '#4f78c8',
                fontWeight: 700,
              }}
            >
              {isDescending ? '↓' : '↑'}
            </button>
          </div>
        </div>

        {/* States */}
        {loading && <div className={Style.messageBox}>Loading appointments…</div>}
        {!loading && error && <div className={Style.errorBox}>{error}</div>}
        {!loading && !error && appointments.length === 0 && (
          <div className={Style.messageBox}>No appointments found</div>
        )}

        {/* Cards */}
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
                      style={{ background: `linear-gradient(135deg, ${avatarColor(appt.patientName)}, ${avatarColor(appt.patientName)}aa)` }}
                    >
                      {(appt.patientName || 'P').charAt(0)}
                    </div>
                    <span className={Style.statusBadge} style={badgeStyle(appt.status)}>
                      {appt.status || 'Unknown'}
                    </span>
                  </div>

                  <h3 className={Style.patientName}>{appt.patientName || 'No Name'}</h3>
                  <p className={Style.patientType}>{appt.appointmentType || 'Appointment'}</p>

                  <div className={Style.divider} />

                  <div className={Style.cardInfo}>
                    <div className={Style.infoItem}>
                      <strong>Date:</strong>
                      <span>{appt.date || '—'}</span>
                    </div>
                    <div className={Style.infoItem}>
                      <strong>Time:</strong>
                      <span>{appt.time || '—'}</span>
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

            {/* PAGINATION - Always show for testing */}
            <div style={{
              flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: '7px', padding: '10px 0', borderTop: '1px solid #e2e8f0',
              marginTop: 32,
            }}>
              {/* Previous button */}
              <button 
                onClick={() => setPageNumber(p => p - 1)} 
                disabled={!hasPreviousPage} 
                style={{
                  width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #e2e8f0',
                  background: '#fff', cursor: !hasPreviousPage ? 'not-allowed' : 'pointer',
                  opacity: !hasPreviousPage ? 0.35 : 1, fontSize: '18px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#64748b',
                }}
              >
                ‹
              </button>

              {/* Page number buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page} 
                  onClick={() => setPageNumber(page)} 
                  style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    border: page === pageNumber ? 'none' : '1px solid #e2e8f0',
                    background: page === pageNumber ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
                    color: page === pageNumber ? '#fff' : '#475569',
                    fontWeight: page === pageNumber ? '700' : '500',
                    fontSize: '13px', cursor: 'pointer',
                    boxShadow: page === pageNumber ? '0 4px 12px rgba(37,99,235,0.32)' : 'none',
                  }}
                >
                  {page}
                </button>
              ))}

              {/* Next button */}
              <button 
                onClick={() => setPageNumber(p => p + 1)} 
                disabled={!hasNextPage} 
                style={{
                  width: '34px', height: '34px', borderRadius: '9px', border: '1px solid #e2e8f0',
                  background: '#fff', cursor: !hasNextPage ? 'not-allowed' : 'pointer',
                  opacity: !hasNextPage ? 0.35 : 1, fontSize: '18px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#64748b',
                }}
              >
                ›
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', marginTop: 12 }}>
              Showing {appointments.length} of {totalCount} appointments
            </p>
          </>
        )}

      </div>
    </div>
  );
}