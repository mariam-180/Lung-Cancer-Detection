import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Style from './Reports.module.css';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';

const API_BASE = 'https://lungcancer.runasp.net/api/Doctor';

const CLASSIFICATION_OPTIONS = {
  'Normal': 0,
  'Adenocarcinoma': 1,
  'LSCC': 2,
  'SCC': 3,
  'Large Cell Carcinoma': 4
};

const CLASSIFICATION_NAMES = ['Normal', 'Adenocarcinoma', 'SCC'];

// ── Toast Component ────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', top: '20px', right: '20px',
      zIndex: 999999, display: 'flex', flexDirection: 'column', gap: '10px',
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {toasts.map(toast => {
        const cfg = {
          success: {
            bg: '#f0fdf4', border: '#86efac',
            iconBg: 'linear-gradient(135deg,#22c55e,#16a34a)',
            title: 'Success!', textColor: '#14532d',
            icon: 'fa-circle-check', barColor: '#22c55e',
          },
          error: {
            bg: '#fef2f2', border: '#fca5a5',
            iconBg: 'linear-gradient(135deg,#f87171,#dc2626)',
            title: 'Error', textColor: '#7f1d1d',
            icon: 'fa-circle-exclamation', barColor: '#ef4444',
          },
          info: {
            bg: '#eff6ff', border: '#93c5fd',
            iconBg: 'linear-gradient(135deg,#60a5fa,#2563eb)',
            title: 'Info', textColor: '#1e3a8a',
            icon: 'fa-circle-info', barColor: '#3b82f6',
          },
        }[toast.type] || {};

        return (
          <div key={toast.id} style={{
            width: '360px', borderRadius: '16px',
            background: cfg.bg, border: `1.5px solid ${cfg.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.07)',
            animation: 'toastSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            overflow: 'hidden', pointerEvents: 'all',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                background: cfg.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${cfg.barColor}44`,
              }}>
                <i className={`fa-solid ${cfg.icon}`} style={{ color: '#fff', fontSize: '17px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: cfg.textColor }}>
                  {cfg.title}
                </p>
                <p style={{
                  margin: '3px 0 0', fontSize: '13px', color: cfg.textColor,
                  opacity: 0.82, lineHeight: 1.45, wordBreak: 'break-word',
                }}>
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: cfg.textColor, opacity: 0.45, fontSize: '15px',
                  padding: '2px', flexShrink: 0, transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ height: '3px', background: `${cfg.barColor}22` }}>
              <div style={{
                height: '100%', background: cfg.barColor,
                animation: `toastProgress ${toast.duration}ms linear forwards`,
              }} />
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

// ── Confirm Dialog via Portal ──────────────────────────────────────────────────
function ConfirmDialog({ config, onConfirm, onCancel }) {
  if (!config) return null;

  const icons = {
    warning: {
      icon: 'fa-triangle-exclamation', color: '#f59e0b',
      bg: '#fffbeb', border: '#fde68a',
      btnColor: 'linear-gradient(135deg,#f59e0b,#d97706)',
      btnShadow: 'rgba(245,158,11,0.35)',
    },
    danger: {
      icon: 'fa-circle-exclamation', color: '#ef4444',
      bg: '#fef2f2', border: '#fecaca',
      btnColor: 'linear-gradient(135deg,#ef4444,#dc2626)',
      btnShadow: 'rgba(239,68,68,0.35)',
    },
    info: {
      icon: 'fa-circle-info', color: '#3b82f6',
      bg: '#eff6ff', border: '#bfdbfe',
      btnColor: 'linear-gradient(135deg,#3b82f6,#2563eb)',
      btnShadow: 'rgba(59,130,246,0.35)',
    },
  }[config.type || 'warning'];

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes dialogBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes dialogIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.88); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999998,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          animation: 'dialogBackdropIn 0.25s ease',
        }}
      />

      {/* Dialog — positioned independently from any parent */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999999,
        width: '440px',
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: '22px',
        background: '#ffffff',
        boxShadow: '0 40px 100px rgba(0,0,0,0.25), 0 8px 32px rgba(0,0,0,0.12)',
        animation: 'dialogIn 0.38s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{ height: '5px', background: icons.btnColor }} />

        <div style={{ padding: '30px 30px 26px' }}>
          {/* Icon circle */}
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            marginBottom: '20px',
            background: icons.bg,
            border: `2px solid ${icons.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i
              className={`fa-solid ${icons.icon}`}
              style={{ fontSize: '28px', color: icons.color }}
            />
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 10px', fontSize: '20px',
            fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px',
          }}>
            {config.title}
          </h3>

          {/* Message */}
          <p style={{
            margin: '0 0 28px', fontSize: '14px',
            color: '#64748b', lineHeight: 1.65,
          }}>
            {config.message}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '11px 22px', borderRadius: '11px',
                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                color: '#475569', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              style={{
                padding: '11px 24px', borderRadius: '11px',
                border: 'none', background: icons.btnColor,
                color: '#fff', fontSize: '14px', fontWeight: '700',
                cursor: 'pointer',
                boxShadow: `0 6px 18px ${icons.btnShadow}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {config.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main Reports Component ─────────────────────────────────────────────────────
export default function Reports() {
  const { token } = useAuth();
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [activeTab, setActiveTab] = useState('list');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [formError, setFormError] = useState('');

  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = 'success', duration = 4000) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => removeToast(id), duration);
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── Confirm dialog state ─────────────────────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [confirmResolve, setConfirmResolve] = useState(null);

  function showConfirm(config) {
    return new Promise(resolve => {
      setConfirmConfig(config);
      setConfirmResolve(() => resolve);
    });
  }

  function handleConfirm() {
    confirmResolve(true);
    setConfirmConfig(null);
  }

  function handleCancel() {
    confirmResolve(false);
    setConfirmConfig(null);
  }

  const [formData, setFormData] = useState({
    patientCaseId: '',
    ctScanId: '',
    finalClassification: 'Normal',
    isAIOverridden: false,
    overrideReason: '',
    doctorNotes: '',
    recommendations: '',
    prescription: '',
  });

  useEffect(() => {
    function handleOpenReportForm() {
      const saved = localStorage.getItem('prefill_report');
      if (saved) {
        const { patientCaseId, ctScanId } = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          patientCaseId: patientCaseId || '',
          ctScanId: ctScanId || '',
        }));
        localStorage.removeItem('prefill_report');
      }
      setSelectedReport(null);
      setFormError('');
      setActiveTab('create');
    }
    window.addEventListener('openReportForm', handleOpenReportForm);
    return () => window.removeEventListener('openReportForm', handleOpenReportForm);
  }, []);

  const isEditing = !!selectedReport && activeTab === 'create';

  const resetForm = () => {
    setFormData({
      patientCaseId: '', ctScanId: '',
      finalClassification: 'Normal', isAIOverridden: false,
      overrideReason: '', doctorNotes: '',
      recommendations: '', prescription: '',
    });
    setSelectedReport(null);
    setFormError('');
  };

  const buildPayload = (includeIds = false) => {
    const payload = {
      finalClassification: CLASSIFICATION_OPTIONS[formData.finalClassification],
      isAIOverridden: formData.isAIOverridden,
    };
    if (includeIds) {
      payload.patientCaseId = parseInt(formData.patientCaseId);
      payload.ctScanId = parseInt(formData.ctScanId);
    }
    if (formData.isAIOverridden && formData.overrideReason) payload.overrideReason = formData.overrideReason;
    if (formData.doctorNotes)     payload.doctorNotes     = formData.doctorNotes;
    if (formData.recommendations) payload.recommendations = formData.recommendations;
    if (formData.prescription)    payload.prescription    = formData.prescription;
    return payload;
  };

  const handleCreateOrUpdate = async () => {
    setFormError('');
    if (!isEditing) {
      if (!formData.patientCaseId || !formData.ctScanId) {
        setFormError('Patient Case ID and CT Scan ID are required.');
        return;
      }
      const pid = parseInt(formData.patientCaseId);
      const cid = parseInt(formData.ctScanId);
      if (isNaN(pid) || pid <= 0) { setFormError('Patient Case ID must be a valid positive number.'); return; }
      if (isNaN(cid) || cid <= 0) { setFormError('CT Scan ID must be a valid positive number.'); return; }
    }

    setActionLoading(isEditing ? 'update' : 'create');
    try {
      let updated;
      if (isEditing) {
        const res = await axios.put(
          `${API_BASE}/reports/${selectedReport.id}`,
          buildPayload(false),
          authHeaders
        );
        updated = res.data.data || res.data;
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
        addToast('Report updated successfully!', 'success');
      } else {
        const res = await axios.post(`${API_BASE}/reports`, buildPayload(true), authHeaders);
        updated = res.data.data || res.data;
        setReports(prev => [updated, ...prev]);
        addToast('Report created successfully!', 'success');
      }
      setActiveTab('list');
      resetForm();
    } catch (err) {
      let msg = 'Failed to save report. ';
      if (err.response?.data?.errors) {
        msg += Object.entries(err.response.data.errors)
          .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`)
          .join('; ');
      } else if (err.response?.data?.message) msg += err.response.data.message;
      else if (err.response?.status === 400) msg += 'Bad request. Verify the IDs.';
      else if (err.response?.status === 404) msg += 'Case or CT Scan not found.';
      else if (err.response?.status === 500) msg += 'Server error. The Case or CT Scan may not exist.';
      else msg += 'Please try again.';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async (id) => {
    const confirmed = await showConfirm({
      type: 'warning',
      title: 'Finalize Report',
      message: 'Are you sure you want to finalize this report? This action cannot be undone.',
      confirmLabel: 'Yes, Finalize',
    });
    if (!confirmed) return;

    setActionLoading(`finalize-${id}`);
    try {
      const res = await axios.post(`${API_BASE}/reports/${id}/finalize`, {}, authHeaders);
      const updated = res.data.data || res.data;
      setReports(prev => prev.map(r => r.id === id ? updated : r));
      if (selectedReport?.id === id) setSelectedReport(updated);
      addToast('Report finalized successfully!', 'success');
    } catch (err) {
      let msg = 'Failed to finalize report. ';
      if (err.response?.data?.message) msg += err.response.data.message;
      else if (err.response?.status === 400) msg += 'The report may already be finalized.';
      else msg += 'Please try again.';
      addToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async (id) => {
    const report = reports.find(r => r.id === id) || selectedReport;
    if (report?.status !== 'Finalized' && report?.status !== 'SentToPatient') {
      addToast('Please finalize the report before sending it to the patient.', 'info');
      return;
    }

    const confirmed = await showConfirm({
      type: 'info',
      title: 'Send to Patient',
      message: 'Send this report to the patient? They will receive it immediately.',
      confirmLabel: 'Yes, Send',
    });
    if (!confirmed) return;

    setActionLoading(`send-${id}`);
    try {
      const res = await axios.post(`${API_BASE}/reports/${id}/send`, {}, authHeaders);
      const updated = res.data.data || res.data;
      setReports(prev => prev.map(r => r.id === id ? updated : r));
      if (selectedReport?.id === id) setSelectedReport(updated);
      addToast('Report sent to patient successfully!', 'success');
    } catch (err) {
      let msg = 'Failed to send report. ';
      if (err.response?.data?.message) msg += err.response.data.message;
      else if (err.response?.status === 404) msg += 'Send endpoint not found.';
      else if (err.response?.status === 405) msg += 'Method not allowed.';
      else msg += 'Please ensure the report is finalized and try again.';
      addToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = (report) => { setSelectedReport(report); setActiveTab('detail'); };

  const openForEdit = (report) => {
    setSelectedReport(report);
    const classificationName =
      typeof report.finalClassification === 'number'
        ? CLASSIFICATION_NAMES[report.finalClassification] || 'Normal'
        : report.finalClassification;
    setFormData({
      patientCaseId:       report.patientCaseId ?? '',
      ctScanId:            report.ctScanId ?? '',
      finalClassification: classificationName,
      isAIOverridden:      report.isAIOverridden ?? false,
      overrideReason:      report.overrideReason ?? '',
      doctorNotes:         report.doctorNotes ?? '',
      recommendations:     report.recommendations ?? '',
      prescription:        report.prescription ?? '',
    });
    setFormError('');
    setActiveTab('create');
  };

  const statusClass = (status) =>
    status === 'Finalized' || status === 'SentToPatient' ? Style.ready : Style.inProgress;

  const classificationClass = (cls) => {
    const name = typeof cls === 'number' ? CLASSIFICATION_NAMES[cls] : cls;
    return name === 'Normal' ? Style.noCancer : Style.danger;
  };

  const getClassificationName = (cls) =>
    typeof cls === 'number' ? CLASSIFICATION_NAMES[cls] || 'Unknown' : cls;

  return (
    <div className={Style.wrapper}>

      {/* Portaled Toast & Dialog */}
      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog
        config={confirmConfig}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className={Style.maindiv}>

        {/* ── Tabs ── */}
        <div className={Style.tabs}>
          <button
            className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`}
            onClick={() => { setActiveTab('list'); resetForm(); }}
          >
            <i className="fa-solid fa-list" /> Reports
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'create' ? Style.activeTab : ''}`}
            onClick={() => { setActiveTab('create'); if (!isEditing) resetForm(); }}
          >
            <i className="fa-solid fa-file-pen" /> {isEditing ? 'Edit Report' : 'Create Report'}
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'detail' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('detail')}
            disabled={!selectedReport}
          >
            <i className="fa-solid fa-file-medical" /> Report Detail
          </button>
        </div>

        {/* ── List ── */}
        {activeTab === 'list' && (
          <>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Medical Reports</h2>
                <p className={Style.subtitle}>
                  {reports.length} report{reports.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <button className={Style.addBtn} onClick={() => { resetForm(); setActiveTab('create'); }}>
                <i className="fa-solid fa-plus" /> New Report
              </button>
            </div>

            <div className={Style.list}>
              {reports.length === 0 && (
                <div className={Style.emptyState}>
                  <div className={Style.emptyIcon}><i className="fa-solid fa-file-medical" /></div>
                  <p className={Style.emptyTitle}>No reports yet</p>
                  <p className={Style.emptySub}>Create your first report to get started</p>
                </div>
              )}
              {reports.map(report => (
                <div key={report.id} className={Style.row}>
                  <div className={Style.rowLeft}>
                    <div className={Style.iconWrap}><i className="fa-solid fa-brain" /></div>
                    <div className={Style.rowInfo}>
                      <h3 className={Style.reportTitle}>Case #{report.patientCaseId}</h3>
                      <p className={Style.patientName}>
                        <i className="fa-solid fa-microscope" /> CT Scan #{report.ctScanId}
                        &nbsp;·&nbsp;
                        <span className={`${Style.badge} ${classificationClass(report.finalClassification)}`}>
                          <span className={Style.dot} />
                          {getClassificationName(report.finalClassification)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className={Style.rowMeta}>
                    <span className={Style.date}>
                      <i className="fa-solid fa-calendar" />{' '}
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`${Style.badge} ${statusClass(report.status)}`}>
                      <span className={Style.dot} /> {report.status}
                    </span>
                  </div>
                  <div className={Style.rowActions}>
                    <button className={Style.viewBtn} onClick={() => openDetail(report)}>
                      <i className="fa-solid fa-eye" /> View
                    </button>
                    <button
                      className={Style.sendBtn}
                      onClick={() => handleSend(report.id)}
                      title="Send to patient"
                      disabled={
                        actionLoading === `send-${report.id}` ||
                        report.status === 'SentToPatient'
                      }
                    >
                      {actionLoading === `send-${report.id}`
                        ? <i className="fa-solid fa-spinner fa-spin" />
                        : <i className="fa-solid fa-paper-plane" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Create / Edit ── */}
        {activeTab === 'create' && (
          <div className={Style.formSection}>
            <div className={Style.formCard}>
              <div className={Style.formCardHeader}>
                <div className={Style.formCardIcon}>
                  <i className="fa-solid fa-file-pen" />
                </div>
                <div>
                  <h3 className={Style.formCardTitle}>
                    {isEditing ? 'Edit Report' : 'Create Diagnosis Report'}
                  </h3>
                  <p className={Style.formCardSub}>Fill in report details below</p>
                </div>
              </div>

              {formError && (
                <div style={{
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
                  color: '#b91c1c', fontSize: '13px',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ wordBreak: 'break-word' }}>{formError}</span>
                </div>
              )}

              <div className={Style.formGrid}>
                {!isEditing && (
                  <>
                    <div className={Style.formGroup}>
                      <label className={Style.formLabel}>
                        Patient Case ID *
                        <span style={{ fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal', marginLeft: '8px' }}>
                          (Must exist in system)
                        </span>
                      </label>
                      <input
                        type="number" value={formData.patientCaseId} min="1" step="1"
                        onChange={e => setFormData({ ...formData, patientCaseId: e.target.value })}
                        className={Style.formInput} placeholder="e.g. 1"
                      />
                    </div>
                    <div className={Style.formGroup}>
                      <label className={Style.formLabel}>
                        CT Scan ID *
                        <span style={{ fontSize: '0.8em', color: '#94a3b8', fontWeight: 'normal', marginLeft: '8px' }}>
                          (Must exist in system)
                        </span>
                      </label>
                      <input
                        type="number" value={formData.ctScanId} min="1" step="1"
                        onChange={e => setFormData({ ...formData, ctScanId: e.target.value })}
                        className={Style.formInput} placeholder="e.g. 1"
                      />
                    </div>
                  </>
                )}

                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Final Classification</label>
                  <select
                    value={formData.finalClassification}
                    onChange={e => setFormData({ ...formData, finalClassification: e.target.value })}
                    className={Style.formInput}
                  >
                    {CLASSIFICATION_NAMES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>AI Override</label>
                  <div className={Style.toggleRow}>
                    <button
                      type="button"
                      className={`${Style.toggleBtn} ${formData.isAIOverridden ? Style.toggleBtnOn : ''}`}
                      onClick={() => setFormData({ ...formData, isAIOverridden: !formData.isAIOverridden })}
                    >
                      <span className={Style.toggleThumb} />
                    </button>
                    <span className={Style.toggleLabel}>
                      {formData.isAIOverridden ? 'Override active' : 'Using AI result'}
                    </span>
                  </div>
                </div>

                {formData.isAIOverridden && (
                  <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                    <label className={Style.formLabel}>Override Reason (Optional)</label>
                    <input
                      type="text" value={formData.overrideReason}
                      onChange={e => setFormData({ ...formData, overrideReason: e.target.value })}
                      className={Style.formInput}
                      placeholder="Explain why the AI result was overridden…"
                    />
                  </div>
                )}

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Doctor Notes (Optional)</label>
                  <textarea
                    value={formData.doctorNotes} rows={4}
                    onChange={e => setFormData({ ...formData, doctorNotes: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextarea}`}
                    placeholder="Clinical observations and findings…"
                  />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Recommendations (Optional)</label>
                  <textarea
                    value={formData.recommendations} rows={3}
                    onChange={e => setFormData({ ...formData, recommendations: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextareaSm}`}
                    placeholder="Follow-up steps, further tests…"
                  />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Prescription (Optional)</label>
                  <textarea
                    value={formData.prescription} rows={3}
                    onChange={e => setFormData({ ...formData, prescription: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextareaSm}`}
                    placeholder="Medications and dosage…"
                  />
                </div>
              </div>

              <div className={Style.formActions}>
                <button
                  className={Style.cancelBtn}
                  onClick={() => { setActiveTab('list'); resetForm(); }}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </button>
                <button
                  className={Style.submitBtn}
                  onClick={handleCreateOrUpdate}
                  disabled={actionLoading !== null}
                >
                  {(actionLoading === 'create' || actionLoading === 'update') && (
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} />
                  )}
                  {actionLoading === 'create' ? 'Creating…' :
                   actionLoading === 'update' ? 'Updating…' :
                   isEditing ? 'Update Report' : 'Create Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Detail ── */}
        {activeTab === 'detail' && selectedReport && (
          <div className={Style.detailSection}>
            <button
              className={Style.backBtn}
              onClick={() => { setActiveTab('list'); setSelectedReport(null); }}
            >
              <i className="fa-solid fa-arrow-left" /> Back to Reports
            </button>

            <div className={Style.detailGrid}>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-file-medical" /></div>
                  <h3 className={Style.detailCardTitle}>Report Info</h3>
                </div>
                <div className={Style.detailRows}>
                  {[
                    { label: 'Report ID',    value: `#${selectedReport.id}`,             isId: true },
                    { label: 'Patient Case', value: `#${selectedReport.patientCaseId}`,  isId: true },
                    { label: 'CT Scan',      value: `#${selectedReport.ctScanId}`,        isId: true },
                    { label: 'AI Override',  value: selectedReport.isAIOverridden ? '✓ Yes' : '— No' },
                    { label: 'Created',      value: new Date(selectedReport.createdAt).toLocaleString() },
                    ...(selectedReport.finalizedAt
                      ? [{ label: 'Finalized', value: new Date(selectedReport.finalizedAt).toLocaleString() }]
                      : []),
                    ...(selectedReport.sentToPatientAt
                      ? [{ label: 'Sent', value: new Date(selectedReport.sentToPatientAt).toLocaleString() }]
                      : []),
                  ].map(({ label, value, isId }) => (
                    <div key={label} className={Style.detailRow}>
                      <span className={Style.detailLabel}>{label}</span>
                      <span className={`${Style.detailValue} ${isId ? Style.detailId : ''}`}>{value}</span>
                    </div>
                  ))}
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Classification</span>
                    <span className={`${Style.badge} ${classificationClass(selectedReport.finalClassification)}`}>
                      <span className={Style.dot} />
                      {getClassificationName(selectedReport.finalClassification)}
                    </span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Status</span>
                    <span className={`${Style.badge} ${statusClass(selectedReport.status)}`}>
                      <span className={Style.dot} /> {selectedReport.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-robot" /></div>
                  <h3 className={Style.detailCardTitle}>AI Override</h3>
                </div>
                <div className={Style.detailRows}>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Overridden</span>
                    <span className={Style.detailValue}>
                      {selectedReport.isAIOverridden ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {selectedReport.isAIOverridden && (
                    <div className={Style.detailRow}>
                      <span className={Style.detailLabel}>Reason</span>
                      <span className={Style.detailValue}>{selectedReport.overrideReason || '—'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${Style.detailCard} ${Style.fullWidthCard}`}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-notes-medical" /></div>
                  <h3 className={Style.detailCardTitle}>Doctor Notes</h3>
                </div>
                <p className={Style.reportContent}>{selectedReport.doctorNotes || '—'}</p>
              </div>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-clipboard-list" /></div>
                  <h3 className={Style.detailCardTitle}>Recommendations</h3>
                </div>
                <p className={Style.reportContent}>{selectedReport.recommendations || '—'}</p>
              </div>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-pills" /></div>
                  <h3 className={Style.detailCardTitle}>Prescription</h3>
                </div>
                <p className={Style.reportContent}>{selectedReport.prescription || '—'}</p>
              </div>

              <div className={`${Style.detailCard} ${Style.fullWidthCard}`}>
                <div className={Style.detailActions}>
                  <button
                    className={Style.viewBtn}
                    onClick={() => openForEdit(selectedReport)}
                    disabled={selectedReport.status === 'SentToPatient' || actionLoading !== null}
                  >
                    <i className="fa-solid fa-pen" /> Edit Report
                  </button>

                  {selectedReport.status !== 'Finalized' && selectedReport.status !== 'SentToPatient' && (
                    <button
                      className={Style.submitBtn}
                      onClick={() => handleFinalize(selectedReport.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading?.startsWith('finalize')
                        ? <><i className="fa-solid fa-spinner fa-spin" /> Finalizing…</>
                        : <><i className="fa-solid fa-check" /> Finalize Report</>}
                    </button>
                  )}

                  <button
                    className={Style.sendBtn}
                    onClick={() => handleSend(selectedReport.id)}
                    disabled={
                      actionLoading === `send-${selectedReport.id}` ||
                      selectedReport.status === 'SentToPatient' ||
                      (selectedReport.status !== 'Finalized' && selectedReport.status !== 'SentToPatient')
                    }
                    title={
                      selectedReport.status !== 'Finalized' && selectedReport.status !== 'SentToPatient'
                        ? 'Please finalize the report first'
                        : 'Send to patient'
                    }
                    style={{ width: 'auto', padding: '0 16px', gap: '6px', display: 'flex', alignItems: 'center' }}
                  >
                    {actionLoading === `send-${selectedReport.id}`
                      ? <><i className="fa-solid fa-spinner fa-spin" /> Sending…</>
                      : <><i className="fa-solid fa-paper-plane" /> Send to Patient</>}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}