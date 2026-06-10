import React, { useState, useEffect, useCallback, useRef } from 'react';
import Style from './AdminDashboard.module.css';

const BASE           = 'https://lungcancer.runasp.net/api/Admin';
const DASHBOARD_API  = `${BASE}/dashboard`;
const AUDIT_LOGS_API = `${BASE}/audit-logs`;
const STATS_API      = `${BASE}/stats`;
const USERS_API      = `${BASE}/users`;

/*
  REAL-TIME STRATEGY
  ──────────────────
  1. Poll every 2 s (down from 8 s) so worst-case lag is 2 s.
  2. Also listen for the custom window event "adminDataChanged" which
     any other component (AdminUsers, etc.) should dispatch right after
     a mutation (approve, activate, delete…).  That gives INSTANT updates.

  How other components fire the event:
    window.dispatchEvent(new CustomEvent('adminDataChanged'));
*/
const POLL_INTERVAL    = 2000;
const REFRESH_EVENT    = 'adminDataChanged';
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const getToken    = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

/* ─────────────────────────────────────────
   ACTION METADATA
───────────────────────────────────────── */
const ACTION_META = {
  Login:             { icon: '🔐', color: 'green',  label: 'Login'              },
  Register:          { icon: '📝', color: 'blue',   label: 'Register'           },
  Logout:            { icon: '🚪', color: 'gray',   label: 'Logout'             },
  ForgotPassword:    { icon: '🔑', color: 'yellow', label: 'Forgot Password'    },
  ResetPassword:     { icon: '🔄', color: 'yellow', label: 'Reset Password'     },
  ActivateUser:      { icon: '✅', color: 'green',  label: 'Activate User'      },
  DeactivateUser:    { icon: '🚫', color: 'red',    label: 'Deactivate User'    },
  DeleteUser:        { icon: '🗑️', color: 'red',    label: 'Delete User'        },
  ApproveDoctor:     { icon: '🩺', color: 'blue',   label: 'Approve Doctor'     },
  RejectDoctor:      { icon: '❌', color: 'red',    label: 'Reject Doctor'      },
  CreateReport:      { icon: '📋', color: 'blue',   label: 'Create Report'      },
  UpdateReport:      { icon: '✏️', color: 'yellow', label: 'Update Report'      },
  DeleteReport:      { icon: '🗑️', color: 'red',    label: 'Delete Report'      },
  UploadScan:        { icon: '🔬', color: 'blue',   label: 'Upload Scan'        },
  AnalyzeScan:       { icon: '🤖', color: 'purple', label: 'Analyze Scan'       },
  BookAppointment:   { icon: '📅', color: 'blue',   label: 'Book Appointment'   },
  CancelAppointment: { icon: '📅', color: 'red',    label: 'Cancel Appointment' },
  UpdateProfile:     { icon: '👤', color: 'yellow', label: 'Update Profile'     },
};
const getActionMeta = (action) =>
  ACTION_META[action] ?? { icon: '⚙️', color: 'gray', label: action ?? '—' };

/* ─────────────────────────────────────────
   PAGINATION
───────────────────────────────────────── */
function Pagination({ currentPage, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return (
    <div className={Style.pagination}>
      <button className={Style.pageBtn} onClick={() => onChange(currentPage - 1)} disabled={currentPage === 1}>
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      {pages.map((p, idx) =>
        p === '…'
          ? <span key={`e${idx}`} className={Style.pageEllipsis}>…</span>
          : <button key={p} className={`${Style.pageBtn} ${p === currentPage ? Style.pageBtnActive : ''}`} onClick={() => onChange(p)}>{p}</button>
      )}
      <button className={Style.pageBtn} onClick={() => onChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function AdminDashboard() {
  const [activeTab,     setActiveTab]     = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [stats,         setStats]         = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [statsLoading,  setStatsLoading]  = useState(false);
  const [error,         setError]         = useState(null);
  const [statsError,    setStatsError]    = useState(null);

  /* logs */
  const [logs,           setLogs]           = useState([]);
  const [logsLoading,    setLogsLoading]    = useState(false);
  const [logsError,      setLogsError]      = useState(null);
  const [logsPage,       setLogsPage]       = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);

  /* filters */
  const [searchTerm,   setSearchTerm]   = useState('');
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [isDescending, setIsDescending] = useState(true);
  const [pageSize,     setPageSize]     = useState(5);

  /* refs — always reflect latest, safe in closures */
  const logsPageRef   = useRef(1);
  const searchRef     = useRef('');
  const sortByRef     = useRef('createdAt');
  const descendingRef = useRef(true);
  const pageSizeRef   = useRef(10);
  const pollTimerRef  = useRef(null);
  const activeTabRef  = useRef('overview');

  logsPageRef.current   = logsPage;
  searchRef.current     = searchTerm;
  sortByRef.current     = sortBy;
  descendingRef.current = isDescending;
  pageSizeRef.current   = pageSize;
  activeTabRef.current  = activeTab;

  /* user name map */
  const [userMap,      setUserMap]      = useState({});
  const userMapFetched = useRef(false);

  /* ── fetch user map ── */
  const fetchUserMap = useCallback(async () => {
    if (userMapFetched.current) return;
    userMapFetched.current = true;
    try {
      const res  = await fetch(`${USERS_API}?PageNumber=1&PageSize=500`, { headers: authHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      const list =
        Array.isArray(json)             ? json :
        Array.isArray(json.data)        ? json.data :
        Array.isArray(json.items)       ? json.items :
        Array.isArray(json.data?.items) ? json.data.items : [];
      const map = {};
      list.forEach(u => {
        const id   = u?.userId ?? u?.UserId ?? u?.id;
        const name = u?.fullName ?? u?.name ?? u?.email;
        if (id && name) map[String(id).toLowerCase()] = name;
      });
      setUserMap(map);
    } catch (_) {}
  }, []);

  /* ── fetch dashboard ── */
  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(DASHBOARD_API, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      setDashboardData(json?.data ?? json);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true); setStatsError(null);
    try {
      const res  = await fetch(STATS_API, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const json = await res.json();
      setStats(json?.data ?? json);
    } catch (err) { setStatsError(err.message); }
    finally { setStatsLoading(false); }
  }, []);

  /* ── fetchLogs — reads everything from refs, stable forever ── */
  const fetchLogs = useCallback(async (page) => {
    setLogsLoading(true); setLogsError(null);
    try {
      const params = new URLSearchParams({
        PageNumber:   page,
        PageSize:     pageSizeRef.current,
        IsDescending: descendingRef.current,
        SortBy:       sortByRef.current,
      });
      if (searchRef.current.trim()) params.append('SearchTerm', searchRef.current.trim());

      const res  = await fetch(`${AUDIT_LOGS_API}?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const json  = await res.json();
      const data  = json?.data ?? json;
      const items = data?.items ?? (Array.isArray(data) ? data : []);
      setLogs(items);
      setLogsTotalPages(data?.totalPages ?? 1);
      setLogsTotalCount(data?.totalCount ?? items.length);
      setLogsPage(page);
      logsPageRef.current = page;
    } catch (err) {
      setLogsError(err.message); setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []); // stable — no state deps

  /* ── polling helpers ── */
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (activeTabRef.current === 'logs') {
        fetchLogs(logsPageRef.current);
      } else {
        fetchDashboard();
        fetchStats();
      }
    }, POLL_INTERVAL);
  }, [fetchLogs, fetchDashboard, fetchStats]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }, []);

  /* ── overview effect ── */
  useEffect(() => {
    if (activeTab !== 'overview') return;
    fetchDashboard(); fetchStats();
    startPolling();
    return stopPolling;
  }, [activeTab, fetchDashboard, fetchStats, startPolling, stopPolling]);

  /* ── logs tab effect ── */
  useEffect(() => {
    if (activeTab !== 'logs') return;
    fetchUserMap();
    fetchLogs(1);
    startPolling();
    return stopPolling;
  }, [activeTab, fetchLogs, fetchUserMap, startPolling, stopPolling]);

  /* ── filter / pageSize change → reset to page 1 ── */
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) { isFirstFilterRender.current = false; return; }
    if (activeTab !== 'logs') return;
    fetchLogs(1);
    startPolling();
  }, [searchTerm, sortBy, isDescending, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
    ── INSTANT REFRESH via custom event ──────────────────────────────────
    Any component that mutates data should fire:
      window.dispatchEvent(new CustomEvent('adminDataChanged'));
    This dashboard will immediately re-fetch the current view.
  */
  useEffect(() => {
    const handleExternalChange = () => {
      if (activeTabRef.current === 'logs') {
        fetchLogs(logsPageRef.current);
        // also refresh user map in case a new user was added/deleted
        userMapFetched.current = false;
        fetchUserMap();
      } else {
        fetchDashboard();
        fetchStats();
      }
    };
    window.addEventListener(REFRESH_EVENT, handleExternalChange);
    return () => window.removeEventListener(REFRESH_EVENT, handleExternalChange);
  }, [fetchLogs, fetchDashboard, fetchStats, fetchUserMap]);

  /* ── tab visibility: pause polling when tab is hidden ── */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // page became visible again → fetch immediately + restart poll
        if (activeTabRef.current === 'logs') {
          fetchLogs(logsPageRef.current);
        } else {
          fetchDashboard(); fetchStats();
        }
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchLogs, fetchDashboard, fetchStats, startPolling, stopPolling]);

  /* ── helpers ── */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d    = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const resolveActor = (log) => {
    const uid = log?.userId ? String(log.userId).toLowerCase() : null;
    if (uid) return { actorLabel: userMap[uid] ?? truncateId(log.userId), actorIsAdmin: false, targetName: null };
    const eid = log?.entityId ? String(log.entityId).toLowerCase() : null;
    return { actorLabel: 'Admin', actorIsAdmin: true, targetName: eid ? (userMap[eid] ?? null) : null };
  };

  const truncateId = (id) => id ? String(id).slice(0, 8) + '…' : '—';

  const statCards = stats ? [
    { icon: '👥', label: 'Total Users',       value: stats.totalUsers        ?? stats.users        },
    { icon: '🩺', label: 'Total Doctors',      value: stats.totalDoctors      ?? stats.doctors      },
    { icon: '🧪', label: 'Total Scans',        value: stats.totalScans        ?? stats.scans        },
    { icon: '📋', label: 'Appointments',       value: stats.totalAppointments ?? stats.appointments },
    { icon: '📊', label: 'Reports Generated',  value: stats.reportsGenerated  ?? stats.reports      },
    { icon: '🔬', label: 'AI Scans Analyzed',  value: stats.aiScansAnalyzed   ?? stats.aiScans      },
    { icon: '📅', label: 'Appointments Today', value: stats.appointmentsToday ?? stats.todayAppts   },
  ].filter(c => c.value !== undefined && c.value !== null) : [];

  const dash = dashboardData ?? {};

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className={Style.wrapper}>
      <div className={Style.maindiv}>

        {/* Tabs */}
        <div className={Style.tabs}>
          <button className={`${Style.tab} ${activeTab === 'overview' ? Style.activeTab : ''}`} onClick={() => setActiveTab('overview')}>
            <i className="fa-solid fa-chart-line"></i> Overview
          </button>
          <button className={`${Style.tab} ${activeTab === 'logs' ? Style.activeTab : ''}`} onClick={() => setActiveTab('logs')}>
            <i className="fa-solid fa-scroll"></i> Audit Logs
            {logsTotalCount > 0 && activeTab === 'logs' && <span className={Style.logsCountBadge}>{logsTotalCount}</span>}
          </button>
        </div>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {activeTab === 'overview' && (
          <div className={Style.overview}>
            <div className={Style.hero}>
              <div className={Style.badge}>AI-POWERED PLATFORM</div>
              <h1 className={Style.mainTitle}>Smart Medical <span>Dashboard</span></h1>
              <p className={Style.subtitle}>Your intelligent assistant for patients, reports, and appointments.</p>

              <div className={Style.metrics}>
                {dash.totalUsers        !== undefined && <div className={Style.metric}><h2>{loading ? '…' : dash.totalUsers}</h2><p>Total Patients</p></div>}
                {dash.aiScansAnalyzed   !== undefined && <div className={Style.metric}><h2>{loading ? '…' : dash.aiScansAnalyzed}</h2><p>AI Scans</p></div>}
                {dash.activeDoctors     !== undefined && <div className={Style.metric}><h2>{loading ? '…' : dash.activeDoctors}</h2><p>Active Doctors</p></div>}
                {dash.totalAppointments !== undefined && <div className={Style.metric}><h2>{loading ? '…' : dash.totalAppointments}</h2><p>Appointments</p></div>}
              </div>

              {error        && <p className={Style.error}>{error}</p>}
              {statsLoading && !stats && <p className={Style.loading}>Loading stats…</p>}
              {statsError   && <p className={Style.error}>{statsError}</p>}

              {statCards.length > 0 && (
                <div className={Style.statsGrid}>
                  {statCards.map(card => (
                    <div key={card.label} className={Style.statCard}>
                      <span className={Style.statIcon}>{card.icon}</span>
                      <div className={Style.statInfo}>
                        <strong>{String(card.value)}</strong>
                        <span>{card.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className={Style.sidebar}>
              <div className={Style.sidebarCard}>
                <div className={Style.sidebarHeader}>
                  <span className={Style.sidebarIcon}>🏥</span>
                  <h3>Platform Status</h3>
                </div>
                <ul className={Style.sidebarList}>
                  {dash.totalUsers        !== undefined && <li><span>Registered Users</span><strong>{loading ? '…' : dash.totalUsers}</strong></li>}
                  {dash.totalDoctors      !== undefined && <li><span>Doctors</span><strong>{loading ? '…' : dash.totalDoctors}</strong></li>}
                  {dash.totalScans        !== undefined && <li><span>Total Scans</span><strong>{loading ? '…' : dash.totalScans}</strong></li>}
                  {dash.totalAppointments !== undefined && <li><span>Appointments</span><strong>{loading ? '…' : dash.totalAppointments}</strong></li>}
                  {dash.reportsGenerated  !== undefined && <li><span>Reports</span><strong>{loading ? '…' : dash.reportsGenerated}</strong></li>}
                  {dash.activeDoctors     !== undefined && <li><span>Active Doctors</span><strong>{loading ? '…' : dash.activeDoctors}</strong></li>}
                  {dash.aiScansAnalyzed   !== undefined && <li><span>AI Scans Analyzed</span><strong>{loading ? '…' : dash.aiScansAnalyzed}</strong></li>}
                  {dash.appointmentsToday !== undefined && <li><span>Appointments Today</span><strong>{loading ? '…' : dash.appointmentsToday}</strong></li>}
                </ul>
              </div>
              <div className={Style.sidebarPulse}>
                <span className={Style.pulseDot} />
                <p>Live — auto-refreshes every 2 s</p>
              </div>
            </aside>
          </div>
        )}

        {/* ══════════════ AUDIT LOGS ══════════════ */}
        {activeTab === 'logs' && (
          <div className={Style.logsContainer}>

            <div className={Style.logsHeader}>
              <div>
                <h2 className={Style.logsTitle}><i className="fa-solid fa-scroll"></i> Audit Logs</h2>
                <p className={Style.logsSubtitle}>
                  {logsLoading ? 'Loading…' : `${logsTotalCount} total entries · page ${logsPage} of ${logsTotalPages}`}
                </p>
              </div>
              <div className={Style.logsHeaderRight}>
                <div className={Style.livePill}>
                  <span className={Style.pulseDot} />
                  Live · 2s
                </div>
                <button className={Style.refreshBtn} onClick={() => fetchLogs(logsPage)} disabled={logsLoading}>
                  <i className={`fa-solid fa-rotate-right ${logsLoading ? Style.spinning : ''}`}></i>
                  Refresh
                </button>
              </div>
            </div>

            <div className={Style.logsToolbar}>
              <div className={Style.searchBox}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Search actions, entity…"
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

              <div className={Style.selectWrap}>
                <i className="fa-solid fa-arrow-down-wide-short"></i>
                <select className={Style.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="createdAt">Sort: Date</option>
                  <option value="action">Sort: Action</option>
                  <option value="entityName">Sort: Entity</option>
                </select>
              </div>

              <button
                className={`${Style.dirBtn} ${isDescending ? Style.dirBtnActive : ''}`}
                onClick={() => setIsDescending(p => !p)}
              >
                <i className={`fa-solid fa-arrow-${isDescending ? 'down' : 'up'}-short-wide`}></i>
                {isDescending ? 'Newest' : 'Oldest'}
              </button>

              <div className={Style.pageSizeWrap}>
                <i className="fa-solid fa-list-ol"></i>
                <select className={Style.filterSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>

            {logsError && (
              <div className={Style.logsError}>
                <i className="fa-solid fa-triangle-exclamation"></i> {logsError}
                <button onClick={() => fetchLogs(logsPage)} className={Style.retryBtn}>
                  <i className="fa-solid fa-rotate-right"></i> Retry
                </button>
              </div>
            )}

            {logsLoading && logs.length === 0 ? (
              <div className={Style.logsLoadingWrap}>
                <div className={Style.spinner}></div>
                <span>Loading audit logs…</span>
              </div>
            ) : (
              <>
                {logs.length === 0 ? (
                  <div className={Style.emptyLogs}>
                    <i className="fa-solid fa-scroll"></i>
                    <p>No logs found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
                  </div>
                ) : (
                  <div className={Style.logList}>
                    {logs.map((log, idx) => {
                      const meta = getActionMeta(log.action);
                      const { actorLabel, actorIsAdmin, targetName } = resolveActor(log);
                      const shortEntityId = log.entityId
                        ? (log.entityId.length > 8 ? log.entityId.slice(0, 8) + '…' : log.entityId)
                        : null;
                      return (
                        <div key={log.id ?? idx} className={`${Style.logCard} ${Style['logCard_' + meta.color]}`}>
                          <div className={`${Style.logIconBadge} ${Style['logBadge_' + meta.color]}`}>
                            <span>{meta.icon}</span>
                          </div>
                          <div className={Style.logContent}>
                            <div className={Style.logTitleRow}>
                              <div className={Style.logActionLine}>
                                <span className={`${Style.logActorChip} ${actorIsAdmin ? Style.logActorAdmin : Style.logActorUser}`}>
                                  <i className={`fa-solid ${actorIsAdmin ? 'fa-shield' : 'fa-user'}`}></i>
                                  {actorLabel}
                                </span>
                                <span className={Style.logActionSep}><i className="fa-solid fa-arrow-right"></i></span>
                                <span className={`${Style.logActionLabel} ${Style['logLabel_' + meta.color]}`}>{meta.label}</span>
                              </div>
                              <span className={Style.logTime}>
                                <i className="fa-regular fa-clock"></i>
                                {formatDate(log.createdAt ?? log.timestamp)}
                              </span>
                            </div>
                            <div className={Style.logSubRow}>
                              {targetName && (
                                <span className={Style.logTargetChip}>
                                  <i className="fa-solid fa-circle-dot"></i>{targetName}
                                </span>
                              )}
                              {log.entityName && (
                                <span className={Style.logChip}>
                                  <i className="fa-solid fa-cube"></i>
                                  {log.entityName}{shortEntityId && ` #${shortEntityId}`}
                                </span>
                              )}
                              {log.ipAddress && (
                                <span className={Style.logChip}>
                                  <i className="fa-solid fa-network-wired"></i>{log.ipAddress}
                                </span>
                              )}
                              {log.id && <span className={Style.logIdChip}>#{log.id}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className={Style.logsFooter}>
                  <span className={Style.logsFooterInfo}>
                    Showing <strong>{logs.length}</strong> of <strong>{logsTotalCount}</strong> entries
                    &nbsp;·&nbsp; {pageSize} per page
                  </span>
                  <Pagination currentPage={logsPage} totalPages={logsTotalPages} onChange={(p) => fetchLogs(p)} />
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}