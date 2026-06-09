import React, { useState } from "react";
import styles from "./Register.module.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    gender: "Male",
    dateOfBirth: "",
    specialization: "",
    licenseNumber: "",
    hospitalName: "",
    yearsOfExperience: 0,
    bio: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  //////////////////////////////////////////////////////
  // ✅ HANDLE INPUT CHANGE
  //////////////////////////////////////////////////////

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Restrict license to numbers only
    if (name === "licenseNumber") {
      if (!/^\d*$/.test(value)) return; // allow only digits
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  //////////////////////////////////////////////////////
  // ✅ SUBMIT
  //////////////////////////////////////////////////////

  const handleSubmit = async () => {
    setError("");

    if (
      !form.fullName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.phoneNumber ||
      !form.dateOfBirth ||
      !form.specialization ||
      !form.licenseNumber ||
      !form.hospitalName
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    //////////////////////////////////////////////////////
    // ✅ LICENSE VALIDATION
    //////////////////////////////////////////////////////

    if (!/^\d{12}$/.test(form.licenseNumber)) {
      setError("License number must be exactly 12 digits.");
      return;
    }

    //////////////////////////////////////////////////////
    // ✅ PASSWORD VALIDATION
    //////////////////////////////////////////////////////

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(form.password)) {
      setError(
        "Password must be 8+ characters with uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        "https://lungcancer.runasp.net/api/Auth/register/doctor",
        {
          ...form,
          dateOfBirth: new Date(form.dateOfBirth).toISOString(),
          yearsOfExperience: Number(form.yearsOfExperience),
        }
      );

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      if (err.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors)
          .flat()
          .join(" ");
        setError(errors);
      } else {
        setError(
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  //////////////////////////////////////////////////////
  // ✅ UI
  //////////////////////////////////////////////////////

  return (
    <div className={styles.registerPage}>
      <div className={styles.registerCard}>

        <h2 className={styles.registerTitle}>Doctor Registration</h2>

        <div className={styles.formGrid}>

          <div className={styles.registerGroup}>
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Phone</label>
            <input
              type="text"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Confirm</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className={styles.registerGroup}>
            <label>DOB</label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Specialization</label>
            <input
              type="text"
              name="specialization"
              value={form.specialization}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>License (12 digits)</label>
            <input
              type="text"
              name="licenseNumber"
              maxLength="12"
              value={form.licenseNumber}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Hospital</label>
            <input
              type="text"
              name="hospitalName"
              value={form.hospitalName}
              onChange={handleChange}
            />
          </div>

          <div className={styles.registerGroup}>
            <label>Experience</label>
            <input
              type="number"
              name="yearsOfExperience"
              value={form.yearsOfExperience}
              onChange={handleChange}
            />
          </div>

          <div className={`${styles.registerGroup} ${styles.fullWidth}`}>
            <label>Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
            />
          </div>

        </div>

        {error && <p className={styles.errorText}>{error}</p>}
        {success && <p className={styles.successText}>Account created successfully!</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={styles.registerBtn}
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

      </div>
    </div>
  );
}