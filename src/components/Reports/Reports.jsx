
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Style from './Reports.module.css';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';

const API_BASE = 'https://lungcancer.runasp.net/api/Doctor';

// All classification options the backend accepts (numeric value)
const CLASSIFICATION_OPTIONS = {
  'Normal': 0,
  'Adenocarcinoma': 1,
  'SCC': 2,
};

// Index → name for numeric classifications
const CLASSIFICATION_NAMES = ['Normal', 'Adenocarcinoma', 'SCC'];

// ── Resolve any AI classification value the API might return into a display label ──
// Handles: full analysis objects, numbers, exact string names, alternate spellings
function resolveAIClassification(raw) {
  if (raw === null || raw === undefined || raw === '') return null;

  // If the API returned the full analysis object {classification, confidenceScore, ...}
  if (typeof raw === 'object') {
    const extracted = raw.classification ?? raw.predictedClass ?? raw.aiLabel ?? null;
    if (!extracted) return null;
    return resolveAIClassification(extracted); // recurse with the string
  }

  // Numeric index
  if (typeof raw === 'number') {
    return CLASSIFICATION_NAMES[raw] ?? null;
  }

  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;

    // Exact match
    if (CLASSIFICATION_NAMES.includes(s)) return s;

    // Case-insensitive match
    const lower = s.toLowerCase();
    const found = CLASSIFICATION_NAMES.find(n => n.toLowerCase() === lower);
    if (found) return found;

    // Common aliases / alternate spellings from the lung cancer model
    const aliases = {
      'squamous': 'SCC',
      'squamouscell': 'SCC',
      'squamous cell carcinoma': 'SCC',
      'squamouscellcarcinoma': 'SCC',
      'lungsquamouscellcarcinoma': 'SCC',
      'lscc': 'SCC',
      'large cell': 'SCC',
      'large cell carcinoma': 'SCC',
      'largecellcarcinoma': 'SCC',
      'largecell': 'SCC',
      'adeno': 'Adenocarcinoma',
      'adenocarc': 'Adenocarcinoma',
      'lungadenocarcinoma': 'Adenocarcinoma',
      'lung adenocarcinoma': 'Adenocarcinoma',
      'benign': 'Normal',
      'lungbenign': 'Normal',
      'normal': 'Normal',
      'lung benign': 'Normal',
    };
    if (aliases[lower]) return aliases[lower];

    // Numeric string e.g. "0", "1", "2"
    const idx = parseInt(s, 10);
    if (!isNaN(idx) && CLASSIFICATION_NAMES[idx]) return CLASSIFICATION_NAMES[idx];
  }

  return null; // unknown — do not lock
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Doctor Reviewed', value: 'DoctorReviewed' },
  { label: 'Finalized', value: 'Finalized' },
  { label: 'Sent to Patient', value: 'SentToPatient' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'createdAt', desc: true },
  { label: 'Oldest First', value: 'createdAt', desc: false },
  { label: 'Case ID ↑', value: 'patientCaseId', desc: false },
  { label: 'Case ID ↓', value: 'patientCaseId', desc: true },
];

// ── Toast ──────────────────────────────────────────────────────────────────────
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
          success: { bg: '#f0fdf4', border: '#86efac', iconBg: 'linear-gradient(135deg,#22c55e,#16a34a)', title: 'Success!', textColor: '#14532d', icon: 'fa-circle-check', barColor: '#22c55e' },
          error:   { bg: '#fef2f2', border: '#fca5a5', iconBg: 'linear-gradient(135deg,#f87171,#dc2626)', title: 'Error',    textColor: '#7f1d1d', icon: 'fa-circle-exclamation', barColor: '#ef4444' },
          info:    { bg: '#eff6ff', border: '#93c5fd', iconBg: 'linear-gradient(135deg,#60a5fa,#2563eb)', title: 'Info',     textColor: '#1e3a8a', icon: 'fa-circle-info', barColor: '#3b82f6' },
        }[toast.type] || {};
        return (
          <div key={toast.id} style={{
            width: 'min(360px, calc(100vw - 40px))', borderRadius: '16px',
            background: cfg.bg, border: `1.5px solid ${cfg.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.07)',
            animation: 'toastSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            overflow: 'hidden', pointerEvents: 'all',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${cfg.barColor}44`,
              }}>
                <i className={`fa-solid ${cfg.icon}`} style={{ color: '#fff', fontSize: '17px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: cfg.textColor }}>{cfg.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: cfg.textColor, opacity: 0.82, lineHeight: 1.45, wordBreak: 'break-word' }}>{toast.message}</p>
              </div>
              <button onClick={() => removeToast(toast.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: cfg.textColor, opacity: 0.45, fontSize: '15px', padding: '2px', flexShrink: 0,
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
              ><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ height: '3px', background: `${cfg.barColor}22` }}>
              <div style={{ height: '100%', background: cfg.barColor, animation: `toastProgress ${toast.duration}ms linear forwards` }} />
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ config, onConfirm, onCancel }) {
  if (!config) return null;
  const icons = {
    warning: { icon: 'fa-triangle-exclamation', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', btnColor: 'linear-gradient(135deg,#f59e0b,#d97706)', btnShadow: 'rgba(245,158,11,0.35)' },
    danger:  { icon: 'fa-circle-exclamation',   color: '#ef4444', bg: '#fef2f2', border: '#fecaca', btnColor: 'linear-gradient(135deg,#ef4444,#dc2626)', btnShadow: 'rgba(239,68,68,0.35)' },
    info:    { icon: 'fa-circle-info',           color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', btnColor: 'linear-gradient(135deg,#3b82f6,#2563eb)', btnShadow: 'rgba(59,130,246,0.35)' },
  }[config.type || 'warning'];
  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes dialogBackdropIn { from{opacity:0}to{opacity:1} }
        @keyframes dialogIn { from{opacity:0;transform:translate(-50%,-48%) scale(0.88)}to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      `}</style>
      <div onClick={onCancel} style={{ position:'fixed',inset:0,zIndex:999998,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(5px)',animation:'dialogBackdropIn 0.25s ease' }} />
      <div style={{
        position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:999999,
        width:'min(440px, calc(100vw - 32px))',borderRadius:'22px',background:'#ffffff',
        boxShadow:'0 40px 100px rgba(0,0,0,0.25),0 8px 32px rgba(0,0,0,0.12)',
        animation:'dialogIn 0.38s cubic-bezier(0.34,1.56,0.64,1)',overflow:'hidden',
      }}>
        <div style={{ height:'5px',background:icons.btnColor }} />
        <div style={{ padding:'30px 30px 26px' }}>
          <div style={{ width:'60px',height:'60px',borderRadius:'18px',marginBottom:'20px',background:icons.bg,border:`2px solid ${icons.border}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <i className={`fa-solid ${icons.icon}`} style={{ fontSize:'28px',color:icons.color }} />
          </div>
          <h3 style={{ margin:'0 0 10px',fontSize:'20px',fontWeight:'800',color:'#0f172a',letterSpacing:'-0.3px' }}>{config.title}</h3>
          <p style={{ margin:'0 0 28px',fontSize:'14px',color:'#64748b',lineHeight:1.65 }}>{config.message}</p>
          <div style={{ display:'flex',gap:'10px',justifyContent:'flex-end',flexWrap:'wrap' }}>
            <button onClick={onCancel} style={{ padding:'11px 22px',borderRadius:'11px',border:'1.5px solid #e2e8f0',background:'#f8fafc',color:'#475569',fontSize:'14px',fontWeight:'600',cursor:'pointer' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#f1f5f9';e.currentTarget.style.borderColor='#cbd5e1'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#f8fafc';e.currentTarget.style.borderColor='#e2e8f0'}}
            >Cancel</button>
            <button onClick={onConfirm} style={{ padding:'11px 24px',borderRadius:'11px',border:'none',background:icons.btnColor,color:'#fff',fontSize:'14px',fontWeight:'700',cursor:'pointer',boxShadow:`0 6px 18px ${icons.btnShadow}` }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.88'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}
            >{config.confirmLabel || 'Confirm'}</button>
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

  // Full report cache: id → full report object (with doctorNotes etc.)
  const [fullReportsCache, setFullReportsCache] = useState({});
  const cacheReport = (report) => {
    const id = report.id ?? report.reportId;
    if (!id) return;
    setFullReportsCache(prev => ({ ...prev, [id]: report }));
  };

  // ── Pagination & Filters ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [pagination, setPagination] = useState({
    pageNumber: 1, pageSize: 4, totalCount: 0,
    totalPages: 1, hasPreviousPage: false, hasNextPage: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortIndex, setSortIndex] = useState(0);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  function addToast(message, type = 'success', duration = 4000) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => removeToast(id), duration);
  }
  function removeToast(id) { setToasts(prev => prev.filter(t => t.id !== id)); }

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [confirmResolve, setConfirmResolve] = useState(null);
  function showConfirm(config) { return new Promise(resolve => { setConfirmConfig(config); setConfirmResolve(() => resolve); }); }
  function handleConfirm() { confirmResolve(true);  setConfirmConfig(null); }
  function handleCancel()  { confirmResolve(false); setConfirmConfig(null); }

  // ── Form state ───────────────────────────────────────────────────────────────
  const emptyForm = {
    patientCaseId: '', ctScanId: '', finalClassification: 'Normal',
    isAIOverridden: false, overrideReason: '',
    doctorNotes: '', recommendations: '', prescription: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [prefillMeta, setPrefillMeta] = useState({
    caseIdLocked: false, scanIdLocked: false,
    classificationLocked: false, aiLabel: '',
  });
  const isEditing = !!selectedReport && activeTab === 'create';

  // ── Fetch Reports List ───────────────────────────────────────────────────────
  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    setFetchError('');
    try {
      const sortOpt = SORT_OPTIONS[sortIndex];
      const params = {
        PageNumber: page, PageSize: pagination.pageSize,
        IsDescending: sortOpt.desc, SortBy: sortOpt.value,
      };
      if (searchTerm)   params.SearchTerm = searchTerm;
      if (statusFilter) params.status     = statusFilter;
      const res = await axios.get(`${API_BASE}/reports`, { ...authHeaders, params });
      const data = res.data?.data || res.data;
      setReports(data.items || []);
      setPagination({
        pageNumber: data.pageNumber, pageSize: data.pageSize,
        totalCount: data.totalCount, totalPages: data.totalPages,
        hasPreviousPage: data.hasPreviousPage, hasNextPage: data.hasNextPage,
      });
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, statusFilter, sortIndex, pagination.pageSize]);

  useEffect(() => { if (activeTab === 'list') fetchReports(1); }, [searchTerm, statusFilter, sortIndex, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Open detail ──────────────────────────────────────────────────────────────
  const openDetail = (report) => {
    const id = report.reportId ?? report.id;
    const cached = fullReportsCache[id];
    const merged = cached
      ? { ...report, ...cached, id, reportId: id }
      : { ...report, id, reportId: id };
    setSelectedReport(merged);
    setActiveTab('detail');
  };

  // ── Listen for openReportForm event ─────────────────────────────────────────
  useEffect(() => {
    function handleOpenReportForm() {
      const saved = localStorage.getItem('prefill_report');
      if (!saved) return;

      const { patientCaseId, ctScanId, aiClassification, fromCTScan } = JSON.parse(saved);
      localStorage.removeItem('prefill_report');

      // ── FIX: use the robust resolver so any API format works ──────────────────
      const aiLabel = resolveAIClassification(aiClassification);

      // Only lock classification when opened from a CT scan AND the AI returned a
      // recognisable result.  If the result is unknown we still open the form but
      // leave the dropdown free for the doctor to choose.
      const hasValidAI = fromCTScan && aiLabel !== null;

      setFormData({
        ...emptyForm,
        patientCaseId: patientCaseId ?? '',
        ctScanId:      ctScanId      ?? '',
        finalClassification: hasValidAI ? aiLabel : 'Normal',
      });

      setPrefillMeta({
        caseIdLocked:         true,
        scanIdLocked:         !!fromCTScan,
        classificationLocked: hasValidAI,   // only lock when we have a real AI result
        aiLabel:              hasValidAI ? aiLabel : '',
      });

      setSelectedReport(null);
      setFormError('');
      setActiveTab('create');
    }

    window.addEventListener('openReportForm', handleOpenReportForm);
    return () => window.removeEventListener('openReportForm', handleOpenReportForm);
  }, []);

  useEffect(() => {
    if (activeTab === 'create') {
      setTimeout(() => document.querySelector('.reportsection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [activeTab]);

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedReport(null);
    setFormError('');
    setPrefillMeta({ caseIdLocked: false, scanIdLocked: false, classificationLocked: false, aiLabel: '' });
  };

  // ── Build payload ────────────────────────────────────────────────────────────
  const buildPayload = (includeIds = false) => {
    const payload = {
      finalClassification: CLASSIFICATION_OPTIONS[formData.finalClassification] ?? 0,
      isAIOverridden:      formData.isAIOverridden,
      doctorNotes:         formData.doctorNotes     || '',
      recommendations:     formData.recommendations || '',
      prescription:        formData.prescription    || '',
    };
    if (includeIds) {
      payload.patientCaseId = parseInt(formData.patientCaseId);
      if (formData.ctScanId !== '' && formData.ctScanId !== null) {
        payload.ctScanId = parseInt(formData.ctScanId);
      }
    }
    if (formData.isAIOverridden && formData.overrideReason) payload.overrideReason = formData.overrideReason;
    return payload;
  };

  const handleCreateOrUpdate = async () => {
    setFormError('');
    if (!isEditing) {
      const pid = parseInt(formData.patientCaseId);
      if (!formData.patientCaseId || isNaN(pid) || pid <= 0) { setFormError('Patient Case ID is required.'); return; }
      if (formData.ctScanId !== '' && formData.ctScanId !== null) {
        const cid = parseInt(formData.ctScanId);
        if (isNaN(cid) || cid <= 0) { setFormError('CT Scan ID must be a valid positive number if provided.'); return; }
      }
    }
    setActionLoading(isEditing ? 'update' : 'create');
    try {
      if (isEditing) {
        const res = await axios.put(`${API_BASE}/reports/${selectedReport.id}`, buildPayload(false), authHeaders);
        const updated = res.data?.data || res.data;
        cacheReport({ ...updated, id: updated.id ?? selectedReport.id });
        addToast('Report updated successfully!', 'success');
        // ── Notify Cases to refresh the selected case ──
        window.dispatchEvent(new CustomEvent('reportUpdated', {
          detail: { patientCaseId: parseInt(formData.patientCaseId) },
        }));
      } else {
        const res = await axios.post(`${API_BASE}/reports`, buildPayload(true), authHeaders);
        const created = res.data?.data || res.data;
        cacheReport(created);
        addToast('Report created successfully!', 'success');
        window.dispatchEvent(new CustomEvent('reportCreated', { detail: { patientCaseId: parseInt(formData.patientCaseId) } }));
      }
      setActiveTab('list');
      resetForm();
      fetchReports(1);
    } catch (err) {
      let msg = 'Failed to save report. ';
      if (err.response?.data?.errors) msg += Object.entries(err.response.data.errors).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`).join('; ');
      else if (err.response?.data?.message) msg += err.response.data.message;
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
    const confirmed = await showConfirm({ type: 'warning', title: 'Finalize Report', message: 'Are you sure you want to finalize this report? This action cannot be undone.', confirmLabel: 'Yes, Finalize' });
    if (!confirmed) return;
    setActionLoading(`finalize-${id}`);
    try {
      const res = await axios.post(`${API_BASE}/reports/${id}/finalize`, {}, authHeaders);
      const updated = res.data?.data || res.data;
      const normalizedId = updated.id ?? updated.reportId ?? id;
      const cached = fullReportsCache[id] || {};
      cacheReport({ ...cached, ...updated, id: normalizedId });
      setReports(prev => prev.map(r => (r.reportId ?? r.id) === id ? { ...r, ...updated } : r));
      if (selectedReport?.id === id) setSelectedReport(prev => ({ ...prev, ...updated, id: normalizedId }));
      addToast('Report finalized successfully!', 'success');
      // ── Notify Cases to refresh the selected case ──
      window.dispatchEvent(new CustomEvent('reportFinalized', { detail: { reportId: id } }));
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
    const report = reports.find(r => (r.reportId ?? r.id) === id) || selectedReport;
    if (report?.status !== 'Finalized' && report?.status !== 'SentToPatient') {
      addToast('Please finalize the report before sending it to the patient.', 'info');
      return;
    }
    const confirmed = await showConfirm({ type: 'info', title: 'Send to Patient', message: 'Send this report to the patient? They will receive it immediately.', confirmLabel: 'Yes, Send' });
    if (!confirmed) return;
    setActionLoading(`send-${id}`);
    try {
      const res = await axios.post(`${API_BASE}/reports/${id}/send`, {}, authHeaders);
      const updated = res.data?.data || res.data;
      const normalizedId = updated.id ?? updated.reportId ?? id;
      const cached = fullReportsCache[id] || {};
      cacheReport({ ...cached, ...updated, id: normalizedId });
      setReports(prev => prev.map(r => (r.reportId ?? r.id) === id ? { ...r, ...updated } : r));
      if (selectedReport?.id === id) setSelectedReport(prev => ({ ...prev, ...updated, id: normalizedId }));
      addToast('Report sent to patient successfully!', 'success');
      // ── Notify Cases to refresh the selected case ──
      window.dispatchEvent(new CustomEvent('reportSent', { detail: { reportId: id } }));
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

  const openForEdit = (report) => {
    setSelectedReport(report);
    const classificationName = typeof report.finalClassification === 'number'
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
    setPrefillMeta({ caseIdLocked: true, scanIdLocked: true, classificationLocked: false, aiLabel: '' });
    setFormError('');
    setActiveTab('create');
  };

  const statusClass = (status) => status === 'Finalized' || status === 'SentToPatient' ? Style.ready : Style.inProgress;
  const classificationClass = (cls) => { const name = typeof cls === 'number' ? CLASSIFICATION_NAMES[cls] : cls; return name === 'Normal' ? Style.noCancer : Style.danger; };
  const getClassificationName = (cls) => typeof cls === 'number' ? CLASSIFICATION_NAMES[cls] || 'Unknown' : cls;

  const classificationPalette = (cls) => {
    const name = typeof cls === 'number' ? CLASSIFICATION_NAMES[cls] : cls;
    if (name === 'Normal') return { bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#166534', border: '#86efac', dot: '#22c55e' };
    return { bg: 'linear-gradient(135deg,#fee2e2,#fecaca)', color: '#991b1b', border: '#fca5a5', dot: '#ef4444' };
  };

  const statusPalette = (status) => {
    if (status === 'Finalized' || status === 'SentToPatient')
      return { bg: '#dcfce7', color: '#166534', dot: '#22c55e', icon: status === 'SentToPatient' ? 'fa-paper-plane' : 'fa-check-circle' };
    return { bg: '#fef9c3', color: '#854d0e', dot: '#eab308', icon: 'fa-clock' };
  };

  const SkeletonRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: '#f1f5f9', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className={Style.skeletonLine} style={{ width: '40%', height: 14 }} />
        <div className={Style.skeletonLine} style={{ width: '60%', height: 12 }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className={Style.skeletonLine} style={{ width: 70, height: 32, borderRadius: 9 }} />
        <div className={Style.skeletonLine} style={{ width: 32, height: 32, borderRadius: 9 }} />
      </div>
    </div>
  );

  return (
    <div className={Style.wrapper}>
      <style>{`
        @media (max-width: 768px) {
          .reports-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .reports-row-meta { align-self: flex-start; }
          .reports-row-actions { align-self: stretch; }
          .reports-row-actions button { flex: 1; }
          .detail-hero-grid { grid-template-columns: repeat(2,1fr) !important; }
          .detail-hero-stat { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
          .detail-hero-banner { padding: 20px !important; }
          .detail-body { padding: 20px !important; }
          .detail-sections-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .reports-form-grid { grid-template-columns: 1fr !important; }
          .reports-form-full { grid-column: 1 !important; }
          .detail-action-bar { flex-direction: column !important; padding: 16px 20px !important; }
          .detail-action-bar > * { width: 100% !important; justify-content: center !important; }
        }
        @media (max-width: 480px) {
          .reports-tabs button span { display: none; }
        }

        .reports-filter-bar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:20px; }
        .reports-search-wrap { position:relative; flex:1; min-width:180px; }
        .reports-search-wrap i { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:13px; pointer-events:none; }
        .reports-search-input { width:100%; height:38px; padding:0 12px 0 34px; background:white; border:1.5px solid #dde3ed; border-radius:10px; font-size:0.82rem; color:#1e293b; outline:none; box-sizing:border-box; transition:border-color 0.2s,box-shadow 0.2s; font-family:inherit; }
        .reports-search-input:focus { border-color:#4f78c8; box-shadow:0 0 0 3px rgba(79,120,200,0.1); }
        .reports-filter-select { height:38px; padding:0 32px 0 12px; background:white; border:1.5px solid #dde3ed; border-radius:10px; font-size:0.82rem; color:#475569; outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; transition:border-color 0.2s; font-family:inherit; }
        .reports-filter-select:focus { border-color:#4f78c8; }

        .reports-pagination { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-top:1px solid #f1f5f9; flex-wrap:wrap; gap:10px; }
        .reports-pagination-info { font-size:0.78rem; color:#94a3b8; font-weight:500; }
        .reports-pagination-btns { display:flex; gap:6px; align-items:center; }
        .reports-page-btn { min-width:32px; height:32px; padding:0 8px; border-radius:8px; border:1.5px solid #dde3ed; background:white; color:#475569; font-size:0.78rem; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:inherit; display:flex; align-items:center; justify-content:center; }
        .reports-page-btn:hover:not(:disabled) { border-color:#4f78c8; color:#4f78c8; background:#eff6ff; }
        .reports-page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .reports-page-btn.active { background:linear-gradient(135deg,#5282d4,#3a62b8); color:white; border-color:transparent; box-shadow:0 2px 8px rgba(79,120,200,0.3); }

        .detail-wrapper { padding: 4px 0; }
        .detail-hero { border-radius: 20px; overflow: hidden; background: white; border: 1px solid #dde3ed; box-shadow: 0 4px 24px rgba(79,120,200,0.08); margin-bottom: 20px; }
        .detail-hero-banner { background: linear-gradient(135deg, #1e3a8a 0%, #3b5fc0 50%, #5282d4 100%); padding: 28px 32px 24px; position: relative; overflow: hidden; }
        .detail-hero-banner::before { content: ''; position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .detail-hero-banner::after { content: ''; position: absolute; bottom: -60px; right: 80px; width: 240px; height: 240px; border-radius: 50%; background: rgba(255,255,255,0.04); }
        .detail-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
        .detail-hero-title { font-size: 1.4rem; font-weight: 800; color: white; margin: 0 0 4px; letter-spacing: -0.02em; }
        .detail-hero-sub { font-size: 0.82rem; color: rgba(255,255,255,0.65); margin: 0; }
        .detail-hero-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .detail-hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; backdrop-filter: blur(8px); }
        .detail-hero-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid rgba(255,255,255,0.1); }
        .detail-hero-stat { padding: 16px 20px; border-right: 1px solid rgba(255,255,255,0.1); }
        .detail-hero-stat:last-child { border-right: none; }
        .detail-hero-stat-label { font-size: 0.7rem; color: rgba(255,255,255,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
        .detail-hero-stat-value { font-size: 0.9rem; font-weight: 700; color: white; margin: 0; }
        .detail-body { padding: 28px 32px; }
        .detail-sections-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .detail-section-card { background: #f8faff; border: 1.5px solid #e8eef8; border-radius: 14px; padding: 18px 20px; transition: border-color 0.2s; }
        .detail-section-card:hover { border-color: #c7d7f0; }
        .detail-section-card.full-width { grid-column: 1 / -1; }
        .detail-section-label { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px; }
        .detail-section-label i { color: #4f78c8; font-size: 0.72rem; }
        .detail-section-text { font-size: 0.87rem; color: #1e293b; line-height: 1.7; margin: 0; white-space: pre-wrap; word-break: break-word; }
        .detail-section-empty { font-size: 0.83rem; color: #94a3b8; font-style: italic; margin: 0; }
        .detail-action-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 20px 32px; border-top: 1px solid #f1f5f9; }
        .detail-not-loaded { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; font-size: 0.83rem; color: #92400e; }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog config={confirmConfig} onConfirm={handleConfirm} onCancel={handleCancel} />

      <div className={Style.maindiv}>

        {/* ── Tabs ── */}
        <div className={`${Style.tabs} reports-tabs`}>
          <button className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`} onClick={() => { setActiveTab('list'); resetForm(); }}>
            <i className="fa-solid fa-list" /> <span>Reports</span>
          </button>
          {activeTab === 'create' && (
            <button className={`${Style.tab} ${Style.activeTab}`} style={{ pointerEvents: 'none' }}>
              <i className="fa-solid fa-file-pen" />
              <span>{isEditing ? 'Edit Report' : 'Create Report'}</span>
            </button>
          )}
          <button className={`${Style.tab} ${activeTab === 'detail' ? Style.activeTab : ''}`} onClick={() => setActiveTab('detail')} disabled={!selectedReport}>
            <i className="fa-solid fa-file-medical" /> <span>Report Detail</span>
          </button>
        </div>

        {/* ════════════════════════ LIST TAB ════════════════════════ */}
        {activeTab === 'list' && (
          <>
            <div className={Style.topBar}>
              <div>
                <h2 className={Style.title}>Medical Reports</h2>
                <p className={Style.subtitle}>{loading ? 'Loading…' : `${pagination.totalCount} report${pagination.totalCount !== 1 ? 's' : ''} found`}</p>
              </div>
            </div>

            <div className="reports-filter-bar">
              <div className="reports-search-wrap">
                <i className="fa-solid fa-magnifying-glass" />
                <input type="text" className="reports-search-input" placeholder="Search by patient name, case number…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
              </div>
              <select className="reports-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select className="reports-filter-select" value={sortIndex} onChange={e => setSortIndex(Number(e.target.value))}>
                {SORT_OPTIONS.map((opt, i) => <option key={i} value={i}>{opt.label}</option>)}
              </select>
              {(searchTerm || statusFilter) && (
                <button onClick={() => { setSearchInput(''); setSearchTerm(''); setStatusFilter(''); }} style={{
                  height: 38, padding: '0 14px', background: '#fef2f2', border: '1.5px solid #fecaca',
                  borderRadius: 10, color: '#dc2626', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}>
                  <i className="fa-solid fa-xmark" /> Clear Filters
                </button>
              )}
            </div>

            {fetchError && (
              <div className={Style.alertError} style={{ marginBottom: 16 }}>
                <i className="fa-solid fa-circle-exclamation" />
                {fetchError}
                <button className={Style.retryBtn} onClick={() => fetchReports(pagination.pageNumber)}>Retry</button>
              </div>
            )}

            <div className={Style.list}>
              {loading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
              ) : reports.length === 0 ? (
                <div className={Style.emptyState}>
                  <div className={Style.emptyIcon}><i className="fa-solid fa-file-medical" /></div>
                  <p className={Style.emptyTitle}>{searchTerm || statusFilter ? 'No reports match your filters' : 'No reports yet'}</p>
                  <p className={Style.emptySub}>{searchTerm || statusFilter ? 'Try adjusting your search or filter criteria' : 'Open a patient case and click "Write Report" to get started'}</p>
                  {(searchTerm || statusFilter) && (
                    <button onClick={() => { setSearchInput(''); setSearchTerm(''); setStatusFilter(''); }} style={{ marginTop: 4, padding: '8px 18px', background: 'white', border: '1.5px solid #dde3ed', borderRadius: 10, color: '#4f78c8', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {reports.map(report => {
                    const id = report.reportId ?? report.id;
                    return (
                      <div key={id} className={`${Style.row} reports-row`}>
                        <div className={Style.rowLeft}>
                          <div className={Style.iconWrap}><i className="fa-solid fa-brain" /></div>
                          <div className={Style.rowInfo}>
                            <h3 className={Style.reportTitle}>
                              {report.caseNumber ? report.caseNumber : `Case #${report.patientCaseId}`}
                            </h3>
                            <p className={Style.patientName}>
                              {report.patientName && <><i className="fa-solid fa-user" style={{ color: '#94a3b8' }} />{report.patientName}&nbsp;·&nbsp;</>}
                              <i className="fa-solid fa-microscope" />
                              {' '}{report.ctScanId ? `CT Scan #${report.ctScanId}` : 'No CT Scan linked'}
                              &nbsp;·&nbsp;
                              <span className={`${Style.badge} ${classificationClass(report.finalClassification)}`}>
                                <span className={Style.dot} />{getClassificationName(report.finalClassification)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className={`${Style.rowMeta} reports-row-meta`}>
                          <span className={Style.date}><i className="fa-solid fa-calendar" />{' '}{new Date(report.createdAt).toLocaleDateString()}</span>
                          <span className={`${Style.badge} ${statusClass(report.status)}`}><span className={Style.dot} />{report.status}</span>
                        </div>
                        <div className={`${Style.rowActions} reports-row-actions`}>
                          <button className={Style.viewBtn} onClick={() => openDetail(report)}>
                            <i className="fa-solid fa-eye" /> View
                          </button>
                          <button className={Style.sendBtn} onClick={() => handleSend(id)} title="Send to patient" disabled={actionLoading === `send-${id}` || report.status === 'SentToPatient'}>
                            {actionLoading === `send-${id}` ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {pagination.totalPages > 1 && (
                    <div className="reports-pagination">
                      <span className="reports-pagination-info">
                        Showing {((pagination.pageNumber - 1) * pagination.pageSize) + 1}–{Math.min(pagination.pageNumber * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
                      </span>
                      <div className="reports-pagination-btns">
                        <button className="reports-page-btn" onClick={() => fetchReports(1)} disabled={!pagination.hasPreviousPage || loading}><i className="fa-solid fa-angles-left" style={{ fontSize: 11 }} /></button>
                        <button className="reports-page-btn" onClick={() => fetchReports(pagination.pageNumber - 1)} disabled={!pagination.hasPreviousPage || loading}><i className="fa-solid fa-angle-left" style={{ fontSize: 11 }} /></button>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === pagination.totalPages || (p >= pagination.pageNumber - 1 && p <= pagination.pageNumber + 1))
                          .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                          .map((p, i) => p === '...'
                            ? <span key={`d${i}`} style={{ color: '#94a3b8', fontSize: '0.78rem', padding: '0 2px' }}>…</span>
                            : <button key={p} className={`reports-page-btn${p === pagination.pageNumber ? ' active' : ''}`} onClick={() => fetchReports(p)} disabled={loading}>{p}</button>
                          )}
                        <button className="reports-page-btn" onClick={() => fetchReports(pagination.pageNumber + 1)} disabled={!pagination.hasNextPage || loading}><i className="fa-solid fa-angle-right" style={{ fontSize: 11 }} /></button>
                        <button className="reports-page-btn" onClick={() => fetchReports(pagination.totalPages)} disabled={!pagination.hasNextPage || loading}><i className="fa-solid fa-angles-right" style={{ fontSize: 11 }} /></button>
                        <select className="reports-filter-select" style={{ height: 32, fontSize: '0.75rem' }} value={pagination.pageSize}
                          onChange={e => { setPagination(prev => ({ ...prev, pageSize: Number(e.target.value) })); fetchReports(1); }}>
                          {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════ CREATE/EDIT TAB ════════════════════════ */}
        {activeTab === 'create' && (
          <div className={`${Style.formSection} reportsection`}>
            <div className={Style.formCard}>
              <div className={Style.formCardHeader}>
                <div className={Style.formCardIcon}><i className="fa-solid fa-file-pen" /></div>
                <div>
                  <h3 className={Style.formCardTitle}>{isEditing ? 'Edit Report' : 'Create Diagnosis Report'}</h3>
                  <p className={Style.formCardSub}>Fill in report details below</p>
                </div>
              </div>

              {formError && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ wordBreak: 'break-word' }}>{formError}</span>
                </div>
              )}

              <div className={`${Style.formGrid} reports-form-grid`}>

                {/* Patient Case ID */}
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>
                    Patient Case ID
                    <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#10b981', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', padding: '2px 7px' }}>Auto-filled</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac' }}>
                    <i className="fa-solid fa-folder-open" style={{ color: '#10b981', fontSize: '16px', flexShrink: 0 }} />
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#065f46' }}>Case #{formData.patientCaseId}</span>
                    <i className="fa-solid fa-lock" style={{ marginLeft: 'auto', color: '#6ee7b7', fontSize: '13px' }} />
                  </div>
                </div>

                {/* CT Scan ID */}
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>
                    CT Scan ID
                    {prefillMeta.scanIdLocked
                      ? <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '2px 7px' }}>Auto-filled</span>
                      : <span style={{ marginLeft: '8px', fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span>}
                  </label>
                  {prefillMeta.scanIdLocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe' }}>
                      <i className="fa-solid fa-x-ray" style={{ color: '#3b82f6', fontSize: '16px', flexShrink: 0 }} />
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#1e40af' }}>Scan #{formData.ctScanId}</span>
                      <i className="fa-solid fa-lock" style={{ marginLeft: 'auto', color: '#93c5fd', fontSize: '13px' }} />
                    </div>
                  ) : (
                    <input type="number" value={formData.ctScanId} min="1" step="1" onChange={e => setFormData({ ...formData, ctScanId: e.target.value })} className={Style.formInput} placeholder="Leave blank if not linked to a specific scan" />
                  )}
                </div>

                {/* Final Classification */}
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>
                    Final Classification
                    {prefillMeta.classificationLocked && !formData.isAIOverridden && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-robot" style={{ fontSize: '10px' }} />AI Locked
                      </span>
                    )}
                    {formData.isAIOverridden && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-pen" style={{ fontSize: '10px' }} />Override Active
                      </span>
                    )}
                  </label>
                  {prefillMeta.classificationLocked && !formData.isAIOverridden ? (
                    /* Locked — show AI result as read-only (only when NOT overriding) */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-robot" style={{ color: '#fff', fontSize: '14px' }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#1e40af' }}>
                          {prefillMeta.aiLabel || formData.finalClassification}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Set by AI analysis — toggle override above to change</p>
                      </div>
                      <i className="fa-solid fa-lock" style={{ marginLeft: 'auto', color: '#93c5fd', fontSize: '14px' }} />
                    </div>
                  ) : (
                    /* Editable dropdown — always shown when overriding OR when not locked */
                    <select value={formData.finalClassification} onChange={e => setFormData({ ...formData, finalClassification: e.target.value })} className={Style.formInput}>
                      {Object.keys(CLASSIFICATION_OPTIONS).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>

                {/* AI Override */}
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>AI Override</label>
                  <div className={Style.toggleRow}>
                    <button type="button" className={`${Style.toggleBtn} ${formData.isAIOverridden ? Style.toggleBtnOn : ''}`} onClick={() => setFormData({ ...formData, isAIOverridden: !formData.isAIOverridden })}>
                      <span className={Style.toggleThumb} />
                    </button>
                    <span className={Style.toggleLabel}>{formData.isAIOverridden ? 'Override active — you can now change the classification' : 'Using AI result'}</span>
                  </div>
                </div>

                {formData.isAIOverridden && (
                  <div className={`${Style.formGroup} ${Style.fullWidth} reports-form-full`}>
                    <label className={Style.formLabel}>Override Reason (Optional)</label>
                    <input type="text" value={formData.overrideReason} onChange={e => setFormData({ ...formData, overrideReason: e.target.value })} className={Style.formInput} placeholder="Explain why the AI result was overridden…" />
                  </div>
                )}

                <div className={`${Style.formGroup} ${Style.fullWidth} reports-form-full`}>
                  <label className={Style.formLabel}>Doctor Notes (Optional)</label>
                  <textarea value={formData.doctorNotes} rows={4} onChange={e => setFormData({ ...formData, doctorNotes: e.target.value })} className={`${Style.formInput} ${Style.formTextarea}`} placeholder="Clinical observations and findings…" />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth} reports-form-full`}>
                  <label className={Style.formLabel}>Recommendations (Optional)</label>
                  <textarea value={formData.recommendations} rows={3} onChange={e => setFormData({ ...formData, recommendations: e.target.value })} className={`${Style.formInput} ${Style.formTextareaSm}`} placeholder="Follow-up steps, further tests…" />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth} reports-form-full`}>
                  <label className={Style.formLabel}>Prescription (Optional)</label>
                  <textarea value={formData.prescription} rows={3} onChange={e => setFormData({ ...formData, prescription: e.target.value })} className={`${Style.formInput} ${Style.formTextareaSm}`} placeholder="Medications and dosage…" />
                </div>
              </div>

              <div className={Style.formActions}>
                <button className={Style.cancelBtn} onClick={() => { setActiveTab('list'); resetForm(); }} disabled={actionLoading !== null}>Cancel</button>
                <button className={Style.submitBtn} onClick={handleCreateOrUpdate} disabled={actionLoading !== null}>
                  {(actionLoading === 'create' || actionLoading === 'update') && <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }} />}
                  {actionLoading === 'create' ? 'Creating…' : actionLoading === 'update' ? 'Updating…' : isEditing ? 'Update Report' : 'Create Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ DETAIL TAB ════════════════════════ */}
        {activeTab === 'detail' && selectedReport && (() => {
          const r = selectedReport;
          const clsPalette  = classificationPalette(r.finalClassification);
          const statPalette = statusPalette(r.status);
          const hasFullData = fullReportsCache[r.id] != null || r.doctorNotes != null || r.recommendations != null || r.prescription != null;

          return (
            <div className="detail-wrapper">
              <button className={Style.backBtn} onClick={() => { setActiveTab('list'); setSelectedReport(null); }}>
                <i className="fa-solid fa-arrow-left" /> Back to Reports
              </button>

              <div className="detail-hero">
                <div className="detail-hero-banner">
                  <div className="detail-hero-top">
                    <div>
                      <p className="detail-hero-sub">
                        <i className="fa-solid fa-folder-open" style={{ marginRight: 6, opacity: 0.7 }} />
                        {r.caseNumber || `Case #${r.patientCaseId}`}
                      </p>
                      <h2 className="detail-hero-title">Report <span style={{ opacity: 0.7 }}>#</span>{r.id}</h2>
                    </div>
                    <div className="detail-hero-badges">
                      <span className="detail-hero-badge" style={{ background: clsPalette.bg, color: clsPalette.color, border: `1.5px solid ${clsPalette.border}` }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: clsPalette.dot, flexShrink: 0 }} />
                        {getClassificationName(r.finalClassification)}
                      </span>
                      <span className="detail-hero-badge" style={{ background: statPalette.bg, color: statPalette.color }}>
                        <i className={`fa-solid ${statPalette.icon}`} style={{ fontSize: '10px' }} />
                        {r.status}
                      </span>
                      {r.isAIOverridden && (
                        <span className="detail-hero-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.3)' }}>
                          <i className="fa-solid fa-robot" style={{ fontSize: '10px' }} />AI Overridden
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="detail-hero-grid">
                    <div className="detail-hero-stat">
                      <p className="detail-hero-stat-label"><i className="fa-solid fa-hashtag" style={{ marginRight: 4 }} />Case ID</p>
                      <p className="detail-hero-stat-value">#{r.patientCaseId}</p>
                    </div>
                    <div className="detail-hero-stat">
                      <p className="detail-hero-stat-label"><i className="fa-solid fa-x-ray" style={{ marginRight: 4 }} />CT Scan</p>
                      <p className="detail-hero-stat-value">{r.ctScanId ? `#${r.ctScanId}` : '—'}</p>
                    </div>
                    <div className="detail-hero-stat">
                      <p className="detail-hero-stat-label"><i className="fa-solid fa-calendar-plus" style={{ marginRight: 4 }} />Created</p>
                      <p className="detail-hero-stat-value" style={{ fontSize: '0.78rem' }}>{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="detail-hero-stat">
                      <p className="detail-hero-stat-label"><i className="fa-solid fa-calendar-check" style={{ marginRight: 4 }} />Finalized</p>
                      <p className="detail-hero-stat-value" style={{ fontSize: '0.78rem' }}>{r.finalizedAt ? new Date(r.finalizedAt).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-body">
                  {!hasFullData && (
                    <div className="detail-not-loaded">
                      <i className="fa-solid fa-circle-info" style={{ color: '#f59e0b', flexShrink: 0 }} />
                      <span>
                        Full report text (notes, recommendations, prescription) is not included in the list response.
                        To view them, <strong>edit and save</strong> the report — the saved version will include all fields.
                      </span>
                    </div>
                  )}

                  {r.isAIOverridden && r.overrideReason && (
                    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fa-solid fa-robot" style={{ color: 'white', fontSize: 14 }} />
                      </div>
                      <div>
                        <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '0.82rem', color: '#92400e' }}>AI Override Reason</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6 }}>{r.overrideReason}</p>
                      </div>
                    </div>
                  )}

                  <div className="detail-sections-grid">
                    <div className="detail-section-card full-width">
                      <p className="detail-section-label"><i className="fa-solid fa-notes-medical" />Doctor Notes</p>
                      {r.doctorNotes ? <p className="detail-section-text">{r.doctorNotes}</p> : <p className="detail-section-empty">No doctor notes recorded for this report.</p>}
                    </div>
                    <div className="detail-section-card">
                      <p className="detail-section-label"><i className="fa-solid fa-clipboard-list" />Recommendations</p>
                      {r.recommendations ? <p className="detail-section-text">{r.recommendations}</p> : <p className="detail-section-empty">No recommendations recorded.</p>}
                    </div>
                    <div className="detail-section-card">
                      <p className="detail-section-label"><i className="fa-solid fa-pills" />Prescription</p>
                      {r.prescription ? <p className="detail-section-text">{r.prescription}</p> : <p className="detail-section-empty">No prescription recorded.</p>}
                    </div>
                    {r.sentToPatientAt && (
                      <div className="detail-section-card full-width" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                        <p className="detail-section-label" style={{ color: '#166534' }}>
                          <i className="fa-solid fa-paper-plane" style={{ color: '#22c55e' }} />Sent to Patient
                        </p>
                        <p className="detail-section-text" style={{ color: '#166534', fontWeight: 600 }}>{new Date(r.sentToPatientAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-action-bar">
                  <button className={Style.viewBtn} onClick={() => openForEdit(r)} disabled={r.status === 'SentToPatient' || actionLoading !== null}>
                    <i className="fa-solid fa-pen" /> Edit Report
                  </button>
                  {r.status !== 'Finalized' && r.status !== 'SentToPatient' && (
                    <button className={Style.submitBtn} onClick={() => handleFinalize(r.id)} disabled={actionLoading !== null}>
                      {actionLoading?.startsWith('finalize') ? <><i className="fa-solid fa-spinner fa-spin" /> Finalizing…</> : <><i className="fa-solid fa-check" /> Finalize Report</>}
                    </button>
                  )}
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 18px', borderRadius: 10, border: 'none',
                      background: r.status === 'Finalized' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#e2e8f0',
                      color: r.status === 'Finalized' ? 'white' : '#94a3b8',
                      fontWeight: 600, fontSize: '0.83rem',
                      cursor: r.status === 'Finalized' ? 'pointer' : 'not-allowed',
                      boxShadow: r.status === 'Finalized' ? '0 4px 14px rgba(34,197,94,0.3)' : 'none',
                      fontFamily: 'inherit',
                      opacity: actionLoading === `send-${r.id}` || r.status === 'SentToPatient' ? 0.6 : 1,
                    }}
                    onClick={() => handleSend(r.id)}
                    disabled={actionLoading === `send-${r.id}` || r.status === 'SentToPatient' || r.status !== 'Finalized'}
                    title={r.status !== 'Finalized' && r.status !== 'SentToPatient' ? 'Please finalize the report first' : 'Send to patient'}
                  >
                    {actionLoading === `send-${r.id}` ? <><i className="fa-solid fa-spinner fa-spin" /> Sending…</> : <><i className="fa-solid fa-paper-plane" /> Send to Patient</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}