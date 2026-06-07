import React, { useState } from 'react';
import styles from './Resetpassword.module.css';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://lungcancer.runasp.net/api/Auth/reset-password';

export default function ResetPassword() {
  const [searchParams]            = useSearchParams();
  const navigate                  = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [form, setForm]         = useState({ password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState({ password: false, confirmPassword: false });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const toggleShow = (field) =>
    setShowPass(prev => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    if (!form.password)                         return 'Please enter a new password.';
    if (form.password.length < 6)               return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post(API_URL, {
        token:           tokenFromUrl,
        email:           emailFromUrl,
        newPassword:     form.password,
        confirmPassword: form.confirmPassword,
        password:        form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        'Failed to reset password. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        <aside className={styles.promo}>
          <div className={styles.promoIcon}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h3 className={styles.promoTitle}>Create a Strong Password</h3>
          <p className={styles.promoText}>
            Choose a password that is at least 6 characters long. A strong password
            includes a mix of letters, numbers, and symbols to keep your account secure.
          </p>
          <ul className={styles.tips}>
            <li><i className="fa-solid fa-check"></i> At least 6 characters</li>
            <li><i className="fa-solid fa-check"></i> Mix of letters & numbers</li>
            <li><i className="fa-solid fa-check"></i> Avoid using personal info</li>
          </ul>
        </aside>

        <div className={styles.card}>
          {!success ? (
            <>
              <div className={styles.iconWrap}>
                <i className="fa-solid fa-key"></i>
              </div>
              <h2 className={styles.title}>Set New Password</h2>
              <p className={styles.subtitle}>
                Enter your new password below to regain access to your account.
              </p>

              <form onSubmit={handleSubmit} className={styles.form}>

                <div className={styles.group}>
                  <label>New Password</label>
                  <div className={styles.inputWrap}>
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type={showPass.password ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter new password"
                      value={form.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => toggleShow('password')}
                      tabIndex={-1}
                    >
                      <i className={`fa-solid ${showPass.password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className={styles.group}>
                  <label>Confirm Password</label>
                  <div className={styles.inputWrap}>
                    <i className="fa-solid fa-lock"></i>
                    <input
                      type={showPass.confirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => toggleShow('confirmPassword')}
                      tabIndex={-1}
                    >
                      <i className={`fa-solid ${showPass.confirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {form.password && form.confirmPassword && (
                  <p className={form.password === form.confirmPassword ? styles.matchOk : styles.matchNo}>
                    <i className={`fa-solid ${form.password === form.confirmPassword ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                    {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}

                {error && (
                  <p className={styles.errorMsg}>
                    <i className="fa-solid fa-circle-exclamation"></i> {error}
                  </p>
                )}

                <button className={styles.btn} type="submit" disabled={loading}>
                  {loading
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Resetting…</>
                    : <><i className="fa-solid fa-check"></i> Reset Password</>
                  }
                </button>
              </form>

              <p className={styles.switch}>
                <Link to="/login"><span className={styles.link}>← Back to Login</span></Link>
              </p>
            </>
          ) : (
            <div className={styles.successBox}>
              <div className={styles.successIcon}>
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h2 className={styles.title}>Password Reset!</h2>
              <p className={styles.subtitle}>
                Your password has been reset successfully. Redirecting you to login…
              </p>
              <Link to="/login">
                <button className={styles.btn}>
                  <i className="fa-solid fa-arrow-right-to-bracket"></i> Go to Login
                </button>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}