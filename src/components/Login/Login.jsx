// // // import React from "react";
// // // import styles from "./Login.module.css";
// // // import doctor from "./../../assets/Images/doctor.png";

// // // export default function Login() {
// // //   return (
// // //     <div className={styles.loginPage}>
// // //       <div className={styles.container}>

// // //         <div className={styles.imageWrapper}>
// // //           <img className={styles.doctorImage} src={doctor} alt="doctor" />
// // //         </div>

// // //         <div className={styles.loginCard}>
// // //           <h2 className={styles.loginTitle}>Login</h2>

// // //           <div className={styles.loginInputGroup}>
// // //             <label>Email</label>
// // //             <input type="email" placeholder="Enter your email" />
// // //           </div>

// // //           <div className={styles.loginInputGroup}>
// // //             <label>Password</label>
// // //             <input type="password" placeholder="Enter your password" />
// // //           </div>

// // //           <button className={styles.loginBtn}>Login</button>
// // // {/* 
// // //           <p className={styles.loginSwitch}>
// // //             Don’t have an account?
// // //             <span className={styles.loginLink}> Register</span>
// // //           </p> */}
// // //         </div>

// // //       </div>
// // //     </div>
// // //   );
// // // }

// // import React from "react";
// // import styles from "./Login.module.css";
// // import doctor from "./../../assets/Images/doctor.png";

// // export default function Login() {
// //   return (
// // <div className="w-full">
// //       <div className={styles.loginPage}>
// //       <div className={styles.container}>

// //         <div className={styles.imageWrapper}>
// //           <img className={styles.doctorImage} src={doctor} alt="doctor" />
// //         </div>

// //         <div className={styles.loginCard}>
// //           <h2 className={styles.loginTitle}>Login</h2>

// //           <div className={styles.loginInputGroup}>
// //             <label>Email</label>
// //             <input type="email" placeholder="Enter your email" />
// //           </div>

// //           <div className={styles.loginInputGroup}>
// //             <label>Password</label>
// //             <input type="password" placeholder="Enter your password" />
// //           </div>

// //           <button className={styles.loginBtn}>Login</button>

// //         </div>

// //       </div>
// //     </div>
// // </div>
// //   );
// // }



// // import React, { useState } from "react";
// // import styles from "./Login.module.css";
// // import doctor from "./../../assets/Images/doctor.png";
// // import { useAuth } from "../../context/AuthContext";
// // import { useNavigate } from "react-router-dom";
// // import axios from "axios";

// // export default function Login() {
// //   const [email, setEmail] = useState("");
// //   const [password, setPassword] = useState("");
// //   const [error, setError] = useState("");
// //   const [loading, setLoading] = useState(false);

// //   const { login } = useAuth();
// //   const navigate = useNavigate();

// //   async function handleLogin(e) {
// //     e.preventDefault();
// //     setLoading(true);
// //     setError("");

// //     try {
// //       const response = await axios.post(
// //         "https://lungcancer.runasp.net/api/Auth/login",
// //         { email, password }
// //       );

// //       // response.data.data has token, role, etc.
// //       const data = response.data.data;

// //       // Save to context
// //       login(data);

// //       // Redirect based on role
// //       if (data.role === "Admin") {
// //         navigate("/admin");
// //       } else if (data.role === "Doctor") {
// //         navigate("/main");
// //       } else {
// //         navigate("/");
// //       }

// //     } catch (err) {
// //       setError("Invalid email or password. Please try again.");
// //     } finally {
// //       setLoading(false);
// //     }
// //   }

// //   return (
// //     <div className="w-full">
// //       <div className={styles.loginPage}>
// //         <div className={styles.container}>

// //           <div className={styles.imageWrapper}>
// //             <img className={styles.doctorImage} src={doctor} alt="doctor" />
// //           </div>

// //           <div className={styles.loginCard}>
// //             <h2 className={styles.loginTitle}>Login</h2>

// //             {/* Error Message */}
// //             {error && (
// //               <p style={{ color: "red", marginBottom: "10px" }}>
// //                 {error}
// //               </p>
// //             )}

// //             <form onSubmit={handleLogin}>
// //               <div className={styles.loginInputGroup}>
// //                 <label>Email</label>
// //                 <input
// //                   type="email"
// //                   placeholder="Enter your email"
// //                   value={email}
// //                   onChange={(e) => setEmail(e.target.value)}
// //                   required
// //                 />
// //               </div>

// //               <div className={styles.loginInputGroup}>
// //                 <label>Password</label>
// //                 <input
// //                   type="password"
// //                   placeholder="Enter your password"
// //                   value={password}
// //                   onChange={(e) => setPassword(e.target.value)}
// //                   required
// //                 />
// //               </div>

// //               <button
// //                 className={styles.loginBtn}
// //                 type="submit"
// //                 disabled={loading}
// //               >
// //                 {loading ? "Logging in..." : "Login"}
// //               </button>
// //             </form>

// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// import React, { useState } from "react";
// import styles from "./Login.module.css";
// import { useAuth } from "../../context/AuthContext";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// export default function Login() {

// 
//   /* Login State */
//   /* ───────────────────────── */

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   /* ───────────────────────── */
//   /* Forgot Password State */
//   /* ───────────────────────── */

//   const [showForgot, setShowForgot] = useState(false);
//   const [forgotEmail, setForgotEmail] = useState("");
//   const [forgotLoading, setForgotLoading] = useState(false);
//   const [forgotSuccess, setForgotSuccess] = useState("");
//   const [forgotError, setForgotError] = useState("");

//   /* ───────────────────────── */
//   /* Reset Password State */
//   /* ───────────────────────── */

//   const [showReset, setShowReset] = useState(false);
//   const [resetToken, setResetToken] = useState("");
//   const [resetEmail, setResetEmail] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [resetLoading, setResetLoading] = useState(false);
//   const [resetSuccess, setResetSuccess] = useState("");
//   const [resetError, setResetError] = useState("");

//   const { login } = useAuth();
//   const navigate = useNavigate();

//   /* ───────────────────────── */
//   /* Handle Login */
//   /* ───────────────────────── */

//   async function handleLogin(e) {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     try {
//       const response = await axios.post(
//         "https://lungcancer.runasp.net/api/Auth/login",
//         { email, password }
//       );

//       const data = response.data.data;
//       login(data);

//       if (data.role === "Admin") {
//         navigate("/admin");
//       } else if (data.role === "Doctor") {
//         navigate("/main");
//       } else {
//         navigate("/");
//       }

//     } catch (err) {
//       setError("Invalid email or password. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* ───────────────────────── */
//   /* Handle Forgot Password */
//   /* ───────────────────────── */

//   async function handleForgotPassword(e) {
//     e.preventDefault();
//     setForgotLoading(true);
//     setForgotError("");
//     setForgotSuccess("");

//     try {
//       await axios.post(
//         "https://lungcancer.runasp.net/api/Auth/forgot-password",
//         { email: forgotEmail }
//       );

//       setForgotSuccess("Reset link sent! Please check your email.");
//     } catch (err) {
//       setForgotError(
//         err.response?.data?.message || "Failed to send reset email."
//       );
//     } finally {
//       setForgotLoading(false);
//     }
//   }

//   /* ───────────────────────── */
//   /* Handle Reset Password */
//   /* ───────────────────────── */

//   async function handleResetPassword(e) {
//     e.preventDefault();
//     setResetError("");
//     setResetSuccess("");

//     if (newPassword !== confirmPassword) {
//       setResetError("Passwords do not match.");
//       return;
//     }

//     setResetLoading(true);

//     try {
//       await axios.post(
//         "https://lungcancer.runasp.net/api/Auth/reset-password",
//         {
//           email: resetEmail,
//           token: resetToken,
//           newPassword: newPassword,
//         }
//       );

//       setResetSuccess("Password reset successfully!");

//       setTimeout(() => {
//         closeAll();
//         setResetToken("");
//         setResetEmail("");
//         setNewPassword("");
//         setConfirmPassword("");
//       }, 2000);

//     } catch (err) {
//       setResetError(
//         err.response?.data?.message || "Failed to reset password."
//       );
//     } finally {
//       setResetLoading(false);
//     }
//   }

//   /* ───────────────────────── */
//   /* View Controls */
//   /* ───────────────────────── */

//   function openForgot() {
//     setShowForgot(true);
//     setShowReset(false);
//     setForgotError("");
//     setForgotSuccess("");
//   }

//   function openReset() {
//     setShowReset(true);
//     setShowForgot(false);
//     setResetError("");
//     setResetSuccess("");
//   }

//   function closeAll() {
//     setShowForgot(false);
//     setShowReset(false);
//   }

//   /* ───────────────────────── */
//   /* JSX */
//   /* ───────────────────────── */

//   return (
//     <div className={styles.loginPage}>
//       <div className={styles.loginCard}>

//         {/* ───────── LOGIN ───────── */}
//         {!showForgot && !showReset && (
//           <>
//             <h2 className={styles.loginTitle}>Welcome Back</h2>

//             {error && <p className={styles.errorMsg}>{error}</p>}

//             <form onSubmit={handleLogin}>
//               <div className={styles.loginInputGroup}>
//                 <label>Email</label>
//                 <input
//                   type="email"
//                   placeholder="Enter your email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                 />
//               </div>

//               <div className={styles.loginInputGroup}>
//                 <label>Password</label>
//                 <input
//                   type="password"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                 />
//               </div>

//               <button
//                 className={styles.loginBtn}
//                 type="submit"
//                 disabled={loading}
//               >
//                 {loading ? "Logging in..." : "Login"}
//               </button>
//             </form>

//             <div className={styles.authLinks}>
//               <button className={styles.authLink} onClick={openForgot} type="button">
//                 Forgot Password?
//               </button>
//               <span className={styles.authLinkDivider}>|</span>
//               <button className={styles.authLink} onClick={openReset} type="button">
//                 Reset Password
//               </button>
//             </div>
//           </>
//         )}

//         {/* ───────── FORGOT PASSWORD ───────── */}
//         {showForgot && (
//           <>
//             <h2 className={styles.loginTitle}>Forgot Password</h2>

//             {forgotError && <p className={styles.errorMsg}>{forgotError}</p>}
//             {forgotSuccess && <p className={styles.successMsg}>{forgotSuccess}</p>}

//             <form onSubmit={handleForgotPassword}>
//               <div className={styles.loginInputGroup}>
//                 <label>Email</label>
//                 <input
//                   type="email"
//                   placeholder="Enter your email"
//                   value={forgotEmail}
//                   onChange={(e) => setForgotEmail(e.target.value)}
//                   required
//                 />
//               </div>

//               <button
//                 className={styles.loginBtn}
//                 type="submit"
//                 disabled={forgotLoading}
//               >
//                 {forgotLoading ? "Sending..." : "Send Reset Link"}
//               </button>
//             </form>

//             <div className={styles.authLinks}>
//               <button className={styles.authLink} onClick={closeAll} type="button">
//                 Back to Login
//               </button>
//             </div>
//           </>
//         )}

//         {/* ───────── RESET PASSWORD ───────── */}
//         {showReset && (
//           <>
//             <h2 className={styles.loginTitle}>Reset Password</h2>

//             {resetError && <p className={styles.errorMsg}>{resetError}</p>}
//             {resetSuccess && <p className={styles.successMsg}>{resetSuccess}</p>}

//             <form onSubmit={handleResetPassword}>
//               <div className={styles.loginInputGroup}>
//                 <label>Email</label>
//                 <input
//                   type="email"
//                   placeholder="Enter your email"
//                   value={resetEmail}
//                   onChange={(e) => setResetEmail(e.target.value)}
//                   required
//                 />
//               </div>

//               <div className={styles.loginInputGroup}>
//                 <label>Reset Token</label>
//                 <input
//                   type="text"
//                   placeholder="Enter token"
//                   value={resetToken}
//                   onChange={(e) => setResetToken(e.target.value)}
//                   required
//                 />
//               </div>

//               <div className={styles.loginInputGroup}>
//                 <label>New Password</label>
//                 <input
//                   type="password"
//                   placeholder="New password"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   required
//                 />
//               </div>

//               <div className={styles.loginInputGroup}>
//                 <label>Confirm Password</label>
//                 <input
//                   type="password"
//                   placeholder="Confirm password"
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   required
//                 />
//               </div>

//               <button
//                 className={styles.loginBtn}
//                 type="submit"
//                 disabled={resetLoading}
//               >
//                 {resetLoading ? "Resetting..." : "Reset Password"}
//               </button>
//             </form>

//             <div className={styles.authLinks}>
//               <button className={styles.authLink} onClick={closeAll} type="button">
//                 Back to Login
//               </button>
//             </div>
//           </>
//         )}

//       </div>
//     </div>
//   );
// }
import React, { useState } from "react";
import styles from "./Login.module.css";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function Login() {


  /* Login State */


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  /* Forgot Password State */


  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");


  /* Reset Password State */


  const [showReset, setShowReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();


  /* Handle Login */


  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "https://lungcancer.runasp.net/api/Auth/login",
        { email, password }
      );

      const data = response.data.data;
      login(data);

      if (data.role === "Admin") {
        navigate("/admin");
      } else if (data.role === "Doctor") {
        navigate("/main");
      } else {
        navigate("/");
      }

    } catch (err) {
      console.log("LOGIN ERROR:", err.response?.status, err.response?.data);

      // ✅ Show the real API message instead of a hardcoded one
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }


  /* Handle Forgot Password */


  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      await axios.post(
        "https://lungcancer.runasp.net/api/Auth/forgot-password",
        { email: forgotEmail }
      );

      setForgotSuccess("Reset link sent! Please check your email.");
    } catch (err) {
      setForgotError(
        err.response?.data?.message || "Failed to send reset email."
      );
    } finally {
      setForgotLoading(false);
    }
  }


  /* Handle Reset Password */


  // async function handleResetPassword(e) {
  //   e.preventDefault();
  //   setResetError("");
  //   setResetSuccess("");

  //   if (newPassword !== confirmPassword) {
  //     setResetError("Passwords do not match.");
  //     return;
  //   }

  //   setResetLoading(true);

  //   try {
  //     await axios.post(
  //       "https://lungcancer.runasp.net/api/Auth/reset-password",
  //       {
  //         email: resetEmail,
  //         token: resetToken,
  //         newPassword: newPassword,
  //       }
  //     );

  //     setResetSuccess("Password reset successfully!");

  //     setTimeout(() => {
  //       closeAll();
  //       setResetToken("");
  //       setResetEmail("");
  //       setNewPassword("");
  //       setConfirmPassword("");
  //     }, 2000);

  //   } catch (err) {
  //     setResetError(
  //       err.response?.data?.message || "Failed to reset password."
  //     );
  //   } finally {
  //     setResetLoading(false);
  //   }
  // }


  /* View Controls */


  function openForgot() {
    setShowForgot(true);
    setShowReset(false);
    setForgotError("");
    setForgotSuccess("");
  }

  function openReset() {
    setShowReset(true);
    setShowForgot(false);
    setResetError("");
    setResetSuccess("");
  }

  function closeAll() {
    setShowForgot(false);
    setShowReset(false);
  }


  /* JSX */


  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>

        {/* ───────── LOGIN ───────── */}
        {!showForgot && !showReset && (
          <>
            <h2 className={styles.loginTitle}>Welcome Back</h2>

            {error && (
              <p className={styles.errorMsg}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
                {error}
              </p>
            )}

            <form onSubmit={handleLogin}>
              <div className={styles.loginInputGroup}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.loginInputGroup}>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                className={styles.loginBtn}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>

            <div className={styles.authLinks}>
              <button className={styles.authLink} onClick={openForgot} type="button">
                Forgot Password?
              </button>
              {/* <span className={styles.authLinkDivider}>|</span>
              <button className={styles.authLink} onClick={openReset} type="button">
                Reset Password
              </button> */}
            </div>

            {/* ✅ Link to register page */}
            <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.88rem", color: "#334155" }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: "#6B5BFF", fontWeight: 700 }}>
                Register
              </Link>
            </p>
          </>
        )}

        {/* ───────── FORGOT PASSWORD ───────── */}
        {showForgot && (
          <>
            <h2 className={styles.loginTitle}>Forgot Password</h2>

            {forgotError && (
              <p className={styles.errorMsg}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
                {forgotError}
              </p>
            )}
            {forgotSuccess && (
              <p className={styles.successMsg}>
                <i className="fa-solid fa-check-circle" style={{ marginRight: 6 }}></i>
                {forgotSuccess}
              </p>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className={styles.loginInputGroup}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <button
                className={styles.loginBtn}
                type="submit"
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div className={styles.authLinks}>
              <button className={styles.authLink} onClick={closeAll} type="button">
                Back to Login
              </button>
            </div>
          </>
        )}

        {/* ───────── RESET PASSWORD ───────── */}
        {/* {showReset && (
          <>
            <h2 className={styles.loginTitle}>Reset Password</h2>

            {resetError && (
              <p className={styles.errorMsg}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i>
                {resetError}
              </p>
            )}
            {resetSuccess && (
              <p className={styles.successMsg}>
                <i className="fa-solid fa-check-circle" style={{ marginRight: 6 }}></i>
                {resetSuccess}
              </p>
            )}

            <form onSubmit={handleResetPassword}>
              <div className={styles.loginInputGroup}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.loginInputGroup}>
                <label>Reset Token</label>
                <input
                  type="text"
                  placeholder="Enter token from your email"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>

              <div className={styles.loginInputGroup}>
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className={styles.loginInputGroup}>
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                className={styles.loginBtn}
                type="submit"
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className={styles.authLinks}>
              <button className={styles.authLink} onClick={closeAll} type="button">
                Back to Login
              </button>
            </div>
          </>
        )} */}

      </div>
    </div>
  );
}