import React, { useState } from 'react';
import Style from './Reports.module.css';
import { useAuth } from '../../context/AuthContext';
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

export default function Reports() {
  const { token } = useAuth();
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [activeTab, setActiveTab] = useState('list');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [formError, setFormError] = useState('');

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

  const isEditing = !!selectedReport && activeTab === 'create';

  const resetForm = () => {
    setFormData({
      patientCaseId: '',
      ctScanId: '',
      finalClassification: 'Normal',
      isAIOverridden: false,
      overrideReason: '',
      doctorNotes: '',
      recommendations: '',
      prescription: '',
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

    if (formData.isAIOverridden && formData.overrideReason)
      payload.overrideReason = formData.overrideReason;
    if (formData.doctorNotes)
      payload.doctorNotes = formData.doctorNotes;
    if (formData.recommendations)
      payload.recommendations = formData.recommendations;
    if (formData.prescription)
      payload.prescription = formData.prescription;

    return payload;
  };

  const handleCreateOrUpdate = async () => {
    setFormError('');

    if (!isEditing) {
      if (!formData.patientCaseId || !formData.ctScanId) {
        setFormError('Patient Case ID and CT Scan ID are required.');
        return;
      }
      const patientCaseIdNum = parseInt(formData.patientCaseId);
      const ctScanIdNum = parseInt(formData.ctScanId);
      if (isNaN(patientCaseIdNum) || patientCaseIdNum <= 0) {
        setFormError('Patient Case ID must be a valid positive number.');
        return;
      }
      if (isNaN(ctScanIdNum) || ctScanIdNum <= 0) {
        setFormError('CT Scan ID must be a valid positive number.');
        return;
      }
    }

    setActionLoading(isEditing ? 'update' : 'create');

    try {
      let updated;

      if (isEditing) {
        const payload = buildPayload(false);
        console.log('PUT Payload:', JSON.stringify(payload, null, 2));

        const res = await axios.put(
          `${API_BASE}/reports/${selectedReport.id}`,
          payload,
          authHeaders
        );
        updated = res.data.data || res.data;
        setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        alert('Report updated successfully!');
      } else {
        const payload = buildPayload(true);
        console.log('POST Payload:', JSON.stringify(payload, null, 2));

        const res = await axios.post(`${API_BASE}/reports`, payload, authHeaders);
        updated = res.data.data || res.data;
        setReports((prev) => [updated, ...prev]);
        alert('Report created successfully!');
      }

      setActiveTab('list');
      resetForm();
    } catch (err) {
      console.error('Failed to save report', err);
      console.error('Error response:', err.response?.data);

      let errorMsg = 'Failed to save report. ';

      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        const errorMessages = [];
        for (const [field, messages] of Object.entries(validationErrors)) {
          errorMessages.push(`${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`);
        }
        errorMsg += errorMessages.join('; ');
      } else if (err.response?.data?.message) {
        errorMsg += err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMsg += 'Bad request. Verify the Patient Case ID and CT Scan ID exist in the system.';
      } else if (err.response?.status === 404) {
        errorMsg += 'Case or CT Scan not found. Please double-check the IDs.';
      } else if (err.response?.status === 500) {
        errorMsg += 'Server error. The Patient Case or CT Scan may not exist.';
      } else {
        errorMsg += 'Please try again.';
      }

      setFormError(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async (id) => {
    if (!window.confirm('Are you sure you want to finalize this report? This action cannot be undone.')) return;

    setActionLoading(`finalize-${id}`);
    try {
      const res = await axios.post(`${API_BASE}/reports/${id}/finalize`, {}, authHeaders);
      const updated = res.data.data || res.data;
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (selectedReport?.id === id) setSelectedReport(updated);
      alert('Report finalized successfully!');
    } catch (err) {
      console.error('Failed to finalize report', err);
      let errorMsg = 'Failed to finalize report. ';
      if (err.response?.data?.message) errorMsg += err.response.data.message;
      else if (err.response?.status === 400) errorMsg += 'The report may already be finalized.';
      else errorMsg += 'Please try again.';
      alert(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async (id) => {
    const report = reports.find(r => r.id === id) || selectedReport;

    if (report?.status !== 'Finalized' && report?.status !== 'SentToPatient') {
      alert('Please finalize the report before sending it to the patient.');
      return;
    }
    if (!window.confirm('Send this report to the patient?')) return;

    setActionLoading(`send-${id}`);
    try {
      const res = await axios.post(`${API_BASE}/reports/${id}/send`, {}, authHeaders);
      const updated = res.data.data || res.data;
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (selectedReport?.id === id) setSelectedReport(updated);
      alert('Report sent successfully!');
    } catch (err) {
      console.error('Failed to send report', err);
      let errorMsg = 'Failed to send report. ';
      if (err.response?.data?.message) errorMsg += err.response.data.message;
      else if (err.response?.status === 404) errorMsg += 'Send endpoint not found.';
      else if (err.response?.status === 405) errorMsg += 'Method not allowed for send.';
      else errorMsg += 'Please ensure the report is finalized and try again.';
      alert(errorMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = (report) => {
    setSelectedReport(report);
    setActiveTab('detail');
  };

  const openForEdit = (report) => {
    setSelectedReport(report);
    const classificationName =
      typeof report.finalClassification === 'number'
        ? CLASSIFICATION_NAMES[report.finalClassification] || 'Normal'
        : report.finalClassification;

    setFormData({
      patientCaseId: report.patientCaseId ?? '',
      ctScanId: report.ctScanId ?? '',
      finalClassification: classificationName,
      isAIOverridden: report.isAIOverridden ?? false,
      overrideReason: report.overrideReason ?? '',
      doctorNotes: report.doctorNotes ?? '',
      recommendations: report.recommendations ?? '',
      prescription: report.prescription ?? '',
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
      <div className={Style.maindiv}>

        {/* ── Tabs ── */}
        <div className={Style.tabs}>
          <button
            className={`${Style.tab} ${activeTab === 'list' ? Style.activeTab : ''}`}
            onClick={() => { setActiveTab('list'); resetForm(); }}
          >
            <i className="fa-solid fa-list"></i> Reports
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'create' ? Style.activeTab : ''}`}
            onClick={() => { setActiveTab('create'); if (!isEditing) resetForm(); }}
          >
            <i className="fa-solid fa-file-pen"></i> {isEditing ? 'Edit Report' : 'Create Report'}
          </button>
          <button
            className={`${Style.tab} ${activeTab === 'detail' ? Style.activeTab : ''}`}
            onClick={() => setActiveTab('detail')}
            disabled={!selectedReport}
          >
            <i className="fa-solid fa-file-medical"></i> Report Detail
          </button>
        </div>

        {/* ── List Tab ── */}
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
                <i className="fa-solid fa-plus"></i> New Report
              </button>
            </div>

            <div className={Style.list}>
              {reports.length === 0 && (
                <div className={Style.emptyState}>
                  <div className={Style.emptyIcon}><i className="fa-solid fa-file-medical"></i></div>
                  <p className={Style.emptyTitle}>No reports yet</p>
                  <p className={Style.emptySub}>Create your first report to get started</p>
                </div>
              )}

              {reports.map((report) => (
                <div key={report.id} className={Style.row}>
                  <div className={Style.rowLeft}>
                    <div className={Style.iconWrap}>
                      <i className="fa-solid fa-brain"></i>
                    </div>
                    <div className={Style.rowInfo}>
                      <h3 className={Style.reportTitle}>Case #{report.patientCaseId}</h3>
                      <p className={Style.patientName}>
                        <i className="fa-solid fa-microscope"></i> CT Scan #{report.ctScanId}
                        &nbsp;·&nbsp;
                        <span className={`${Style.badge} ${classificationClass(report.finalClassification)}`}>
                          <span className={Style.dot}></span>
                          {getClassificationName(report.finalClassification)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className={Style.rowMeta}>
                    <span className={Style.date}>
                      <i className="fa-solid fa-calendar"></i>{' '}
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`${Style.badge} ${statusClass(report.status)}`}>
                      <span className={Style.dot}></span> {report.status}
                    </span>
                  </div>
                  <div className={Style.rowActions}>
                    <button className={Style.viewBtn} onClick={() => openDetail(report)}>
                      <i className="fa-solid fa-eye"></i> View
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
                      {actionLoading === `send-${report.id}` ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-paper-plane"></i>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Create / Edit Tab ── */}
        {activeTab === 'create' && (
          <div className={Style.formSection}>
            <div className={Style.formCard}>
              <div className={Style.formCardHeader}>
                <div className={Style.formCardIcon}>
                  <i className="fa-solid fa-file-pen"></i>
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
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#c00',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <i className="fa-solid fa-exclamation-circle" style={{ marginTop: '2px', flexShrink: 0 }}></i>
                  <span style={{ wordBreak: 'break-word' }}>{formError}</span>
                </div>
              )}

              <div className={Style.formGrid}>
                {!isEditing && (
                  <>
                    <div className={Style.formGroup}>
                      <label className={Style.formLabel}>
                        Patient Case ID *
                        <span style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal', marginLeft: '8px' }}>
                          (Must exist in system)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={formData.patientCaseId}
                        onChange={(e) => setFormData({ ...formData, patientCaseId: e.target.value })}
                        className={Style.formInput}
                        placeholder="e.g. 1"
                        required
                        min="1"
                        step="1"
                      />
                    </div>

                    <div className={Style.formGroup}>
                      <label className={Style.formLabel}>
                        CT Scan ID *
                        <span style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal', marginLeft: '8px' }}>
                          (Must exist in system)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={formData.ctScanId}
                        onChange={(e) => setFormData({ ...formData, ctScanId: e.target.value })}
                        className={Style.formInput}
                        placeholder="e.g. 1"
                        required
                        min="1"
                        step="1"
                      />
                    </div>
                  </>
                )}

                <div className={Style.formGroup}>
                  <label className={Style.formLabel}>Final Classification</label>
                  <select
                    value={formData.finalClassification}
                    onChange={(e) => setFormData({ ...formData, finalClassification: e.target.value })}
                    className={Style.formInput}
                  >
                    {CLASSIFICATION_NAMES.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
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
                      type="text"
                      value={formData.overrideReason}
                      onChange={(e) => setFormData({ ...formData, overrideReason: e.target.value })}
                      className={Style.formInput}
                      placeholder="Explain why the AI result was overridden…"
                    />
                  </div>
                )}

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Doctor Notes (Optional)</label>
                  <textarea
                    value={formData.doctorNotes}
                    onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextarea}`}
                    placeholder="Clinical observations and findings…"
                    rows={4}
                  />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Recommendations (Optional)</label>
                  <textarea
                    value={formData.recommendations}
                    onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextareaSm}`}
                    placeholder="Follow-up steps, further tests…"
                    rows={3}
                  />
                </div>

                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}>Prescription (Optional)</label>
                  <textarea
                    value={formData.prescription}
                    onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                    className={`${Style.formInput} ${Style.formTextareaSm}`}
                    placeholder="Medications and dosage…"
                    rows={3}
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
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  )}
                  {actionLoading === 'create' ? 'Creating…' :
                   actionLoading === 'update' ? 'Updating…' :
                   isEditing ? 'Update Report' : 'Create Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Detail Tab ── */}
        {activeTab === 'detail' && selectedReport && (
          <div className={Style.detailSection}>
            <button
              className={Style.backBtn}
              onClick={() => { setActiveTab('list'); setSelectedReport(null); }}
            >
              <i className="fa-solid fa-arrow-left"></i> Back to Reports
            </button>

            <div className={Style.detailGrid}>
              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-file-medical"></i></div>
                  <h3 className={Style.detailCardTitle}>Report Info</h3>
                </div>
                <div className={Style.detailRows}>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Report ID</span>
                    <span className={`${Style.detailValue} ${Style.detailId}`}>#{selectedReport.id}</span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Patient Case</span>
                    <span className={`${Style.detailValue} ${Style.detailId}`}>#{selectedReport.patientCaseId}</span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>CT Scan</span>
                    <span className={`${Style.detailValue} ${Style.detailId}`}>#{selectedReport.ctScanId}</span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Classification</span>
                    <span className={`${Style.badge} ${classificationClass(selectedReport.finalClassification)}`}>
                      <span className={Style.dot}></span>
                      {getClassificationName(selectedReport.finalClassification)}
                    </span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>AI Override</span>
                    <span className={Style.detailValue}>
                      {selectedReport.isAIOverridden ? '✓ Yes' : '— No'}
                    </span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Status</span>
                    <span className={`${Style.badge} ${statusClass(selectedReport.status)}`}>
                      <span className={Style.dot}></span> {selectedReport.status}
                    </span>
                  </div>
                  <div className={Style.detailRow}>
                    <span className={Style.detailLabel}>Created</span>
                    <span className={Style.detailValue}>
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedReport.finalizedAt && (
                    <div className={Style.detailRow}>
                      <span className={Style.detailLabel}>Finalized</span>
                      <span className={Style.detailValue}>
                        {new Date(selectedReport.finalizedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedReport.sentToPatientAt && (
                    <div className={Style.detailRow}>
                      <span className={Style.detailLabel}>Sent</span>
                      <span className={Style.detailValue}>
                        {new Date(selectedReport.sentToPatientAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-robot"></i></div>
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
                  <div className={Style.detailIcon}><i className="fa-solid fa-notes-medical"></i></div>
                  <h3 className={Style.detailCardTitle}>Doctor Notes</h3>
                </div>
                <p className={Style.reportContent}>{selectedReport.doctorNotes || '—'}</p>
              </div>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-clipboard-list"></i></div>
                  <h3 className={Style.detailCardTitle}>Recommendations</h3>
                </div>
                <p className={Style.reportContent}>{selectedReport.recommendations || '—'}</p>
              </div>

              <div className={Style.detailCard}>
                <div className={Style.detailCardHeader}>
                  <div className={Style.detailIcon}><i className="fa-solid fa-pills"></i></div>
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
                    <i className="fa-solid fa-pen"></i> Edit Report
                  </button>

                  {selectedReport.status !== 'Finalized' && selectedReport.status !== 'SentToPatient' && (
                    <button
                      className={Style.submitBtn}
                      onClick={() => handleFinalize(selectedReport.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading?.startsWith('finalize') ? (
                        <><i className="fa-solid fa-spinner fa-spin"></i> Finalizing…</>
                      ) : (
                        <><i className="fa-solid fa-check"></i> Finalize Report</>
                      )}
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
                    {actionLoading === `send-${selectedReport.id}` ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Sending…</>
                    ) : (
                      <><i className="fa-solid fa-paper-plane"></i> Send to Patient</>
                    )}
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