import React, { useState, useEffect } from 'react';
import Style from './DoctorProfile.module.css';
import { useAuth } from '../../Context/AuthContext';
import axios from 'axios';

const BASE_URL = 'https://lungcancer.runasp.net/api/Doctor';

export default function DoctorProfile() {
  const [activeTab, setActiveTab] = useState('profile');
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    specialty: '',
    email: '',
    phone: '',
    bio: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const { token, updateUser, refreshAccessToken } = useAuth();

  // ── Helper: makes a request, retries once with a new token on 401 ──
  async function authRequest(requestFn) {
    try {
      return await requestFn(token);
    } catch (err) {
      if (err?.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return await requestFn(newToken); // retry with new token
        }
      }
      throw err; // re-throw if not 401 or refresh failed
    }
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await authRequest((t) =>
          axios.get(`${BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${t}` },
          })
        );

        const data = response.data.data || response.data;

        setDoctor(data);
        setForm({
          fullName: data?.fullName || data?.name || '',
          specialty: data?.specialty || data?.specialization || '',
          email: data?.email || '',
          phone: data?.phone || data?.phoneNumber || '',
          bio: data?.bio || data?.about || data?.description || '',
        });

      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      await authRequest((t) =>
        axios.put(
          `${BASE_URL}/profile`,
          {
            fullName: form.fullName,
            specialty: form.specialty,
            email: form.email,
            phone: form.phone,
            bio: form.bio,
          },
          { headers: { Authorization: `Bearer ${t}` } }
        )
      );

      setDoctor(prev => ({
        ...prev,
        fullName: form.fullName,
        name: form.fullName,
        specialty: form.specialty,
        specialization: form.specialty,
        email: form.email,
        phone: form.phone,
        phoneNumber: form.phone,
        bio: form.bio,
        about: form.bio,
        description: form.bio,
      }));

      updateUser({ fullName: form.fullName });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('profile');
      }, 1200);

    } catch (err) {
      setSaveError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        'Failed to save changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordInput = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      setPasswordError(
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&).'
      );
      return;
    }

    try {
      setPasswordSaving(true);

      await authRequest((t) =>
        axios.post(
          'https://lungcancer.runasp.net/api/Auth/change-password',
          {
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
            confirmNewPassword: passwordForm.confirmPassword,
          },
          {
            headers: {
              Authorization: `Bearer ${t}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        )
      );

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        setPasswordSuccess(false);
        setActiveTab('profile');
      }, 1500);

    } catch (err) {
      if (err.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat().join(' ');
        setPasswordError(errors);
      } else {
        setPasswordError(
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          'Failed to change password. Please check your current password and try again.'
        );
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return (
    <div className={Style.profileContainer}>
      <p style={{ color: '#4f78c8', fontWeight: 600 }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
        Loading profile...
      </p>
    </div>
  );

  if (error) return (
    <div className={Style.profileContainer}>
      <p style={{ color: 'red' }}>{error}</p>
    </div>
  );

  return (
    <div className={Style.profileContainer}>
      <div className={Style.inner}>

        {/* ── Left: Profile Card ── */}
        <div className={Style.leftCol}>
          <div className={Style.avatarWrap}>
            <img
              src={doctor?.profileImage || doctor?.image || "https://randomuser.me/api/portraits/men/32.jpg"}
              alt="Doctor"
              className={Style.avatar}
            />
            <span className={Style.onlineDot}></span>
          </div>

          <h2 className={Style.doctorName}>
            {doctor?.fullName || doctor?.name || 'N/A'}
          </h2>

          <p className={Style.doctorRole}>
            <i className="fa-solid fa-stethoscope"></i>
            {doctor?.specialty || doctor?.specialization || 'Doctor'}
          </p>

          <p className={Style.doctorEmail}>
            <i className="fa-solid fa-envelope"></i>
            {doctor?.email || 'N/A'}
          </p>

          <div className={Style.statRow}>
            <div className={Style.stat}>
              <strong>{doctor?.yearsOfExperience ?? doctor?.experience ?? '—'}</strong>
              <span>Years Exp.</span>
            </div>
            <div className={Style.statDivider}></div>
            <div className={Style.stat}>
              <strong>{doctor?.rating ?? '—'}</strong>
              <span>Rating</span>
            </div>
            <div className={Style.statDivider}></div>
            <div className={Style.stat}>
              <strong>{doctor?.patientsCount ?? doctor?.patients ?? '—'}</strong>
              <span>Patients</span>
            </div>
          </div>

          <button className={Style.editBtn} onClick={() => setActiveTab('edit')}>
            <i className="fa-solid fa-pen"></i>
            Edit Profile
          </button>
        </div>

        {/* ── Right ── */}
        <div className={Style.rightCol}>

          {/* Tabs */}
          <div className={Style.tabs}>
            <button
              className={`${Style.tab} ${activeTab === 'profile' ? Style.activeTab : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fa-solid fa-user-doctor"></i>
              Profile
            </button>
            <button
              className={`${Style.tab} ${activeTab === 'edit' ? Style.activeTab : ''}`}
              onClick={() => setActiveTab('edit')}
            >
              <i className="fa-solid fa-pen"></i>
              Edit Profile
            </button>
            <button
              className={`${Style.tab} ${activeTab === 'password' ? Style.activeTab : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <i className="fa-solid fa-lock"></i>
              Change Password
            </button>
          </div>

          {/* ── Tab: View Profile ── */}
          {activeTab === 'profile' && (
            <>
              <div className={Style.section}>
                <div className={Style.sectionHeader}>
                  <div className={Style.sectionIcon}><i className="fa-solid fa-id-card"></i></div>
                  <h3 className={Style.sectionTitle}>Short Bio</h3>
                </div>
                <p className={Style.bioText}>
                  {doctor?.bio || doctor?.about || doctor?.description || 'No bio available.'}
                </p>
              </div>

              <div className={Style.section}>
                <div className={Style.sectionHeader}>
                  <div className={Style.sectionIcon}><i className="fa-solid fa-list-check"></i></div>
                  <h3 className={Style.sectionTitle}>Services & Price List</h3>
                </div>
                <div className={Style.servicesList}>
                  <div className={Style.serviceRow}>
                    <div className={Style.serviceLeft}>
                      <div className={Style.serviceIcon}><i className="fa-solid fa-x-ray"></i></div>
                      <div>
                        <p className={Style.serviceName}>Order Imaging Tests</p>
                        <p className={Style.serviceSub}>X-Ray · CT · MRI</p>
                      </div>
                    </div>
                  </div>
                  <div className={Style.serviceRow}>
                    <div className={Style.serviceLeft}>
                      <div className={Style.serviceIcon}><i className="fa-solid fa-calendar-check"></i></div>
                      <div>
                        <p className={Style.serviceName}>Recommend Follow-Ups</p>
                        <p className={Style.serviceSub}>Post-diagnosis planning</p>
                      </div>
                    </div>
                  </div>
                  <div className={Style.serviceRow}>
                    <div className={Style.serviceLeft}>
                      <div className={Style.serviceIcon}><i className="fa-solid fa-file-medical"></i></div>
                      <div>
                        <p className={Style.serviceName}>Report & Consult</p>
                        <p className={Style.serviceSub}>Detailed written report</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Edit Profile ── */}
          {activeTab === 'edit' && (
            <div className={Style.section}>
              <div className={Style.sectionHeader}>
                <div className={Style.sectionIcon}><i className="fa-solid fa-pen"></i></div>
                <h3 className={Style.sectionTitle}>Update Profile</h3>
              </div>

              <div className={Style.formGrid}>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}><i className="fa-solid fa-user"></i> Full Name</label>
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange} className={Style.formInput} />
                </div>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}><i className="fa-solid fa-stethoscope"></i> Specialty</label>
                  <input type="text" name="specialty" value={form.specialty} onChange={handleChange} className={Style.formInput} />
                </div>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}><i className="fa-solid fa-envelope"></i> Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className={Style.formInput} />
                </div>
                <div className={Style.formGroup}>
                  <label className={Style.formLabel}><i className="fa-solid fa-phone"></i> Phone</label>
                  <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" className={Style.formInput} />
                </div>
                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}><i className="fa-solid fa-id-card"></i> Bio</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} className={`${Style.formInput} ${Style.formTextarea}`} />
                </div>
              </div>

              {saveError && (
                <p style={{ color: '#e05252', fontSize: '0.82rem', marginBottom: 12 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>{saveError}
                </p>
              )}
              {saveSuccess && (
                <p style={{ color: '#22c55e', fontSize: '0.82rem', marginBottom: 12 }}>
                  <i className="fa-solid fa-check-circle" style={{ marginRight: 6 }}></i>Profile updated successfully!
                </p>
              )}

              <div className={Style.formActions}>
                <button className={Style.cancelBtn} onClick={() => { setActiveTab('profile'); setSaveError(''); setSaveSuccess(false); }} disabled={saving}>
                  Cancel
                </button>
                <button className={Style.submitBtn} onClick={handleSave} disabled={saving}>
                  {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-check"></i> Save Changes</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Change Password ── */}
          {activeTab === 'password' && (
            <div className={Style.section}>
              <div className={Style.sectionHeader}>
                <div className={Style.sectionIcon}><i className="fa-solid fa-lock"></i></div>
                <h3 className={Style.sectionTitle}>Change Password</h3>
              </div>

              <div className={Style.formGrid}>
                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}><i className="fa-solid fa-key"></i> Current Password</label>
                  <input type="password" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordInput} className={Style.formInput} />
                </div>
                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}><i className="fa-solid fa-lock"></i> New Password</label>
                  <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordInput} className={Style.formInput} />
                </div>
                <div className={`${Style.formGroup} ${Style.fullWidth}`}>
                  <label className={Style.formLabel}><i className="fa-solid fa-check"></i> Confirm Password</label>
                  <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordInput} className={Style.formInput} />
                </div>
              </div>

              <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: 12 }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
                Password must be 8+ characters with uppercase, lowercase, a number, and a special character (@$!%*?&).
              </p>

              {passwordError && (
                <p style={{ color: '#e05252', fontSize: '0.82rem', marginBottom: 12 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>{passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p style={{ color: '#22c55e', fontSize: '0.82rem', marginBottom: 12 }}>
                  <i className="fa-solid fa-check-circle" style={{ marginRight: 6 }}></i>Password changed successfully!
                </p>
              )}

              <div className={Style.formActions}>
                <button className={Style.cancelBtn} onClick={() => { setActiveTab('profile'); setPasswordError(''); setPasswordSuccess(false); }} disabled={passwordSaving}>
                  Cancel
                </button>
                <button className={Style.submitBtn} onClick={handleChangePassword} disabled={passwordSaving}>
                  {passwordSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Updating...</> : <><i className="fa-solid fa-lock"></i> Change Password</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}