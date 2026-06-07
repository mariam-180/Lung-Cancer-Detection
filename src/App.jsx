// import { useState } from 'react'
// import '@fortawesome/fontawesome-free/css/all.min.css';
// import './App.css'
// import { createBrowserRouter, RouterProvider } from 'react-router-dom'
// import Layout from './components/Layout/Layout'
// import Welcome from './components/Welcome/Welcome';
// import Article from './components/Article/Article';
// import Notfound from './components/Notfound/Notfound'
// import Login from './components/Login/Login';
// import Register from './components/Register/Register';
// import DoctorProfile from './components/DoctorProfile/DoctorProfile';
// import MainContent from './components/MainContent/MainContent';
// import AdminPage from './components/AdminPage/AdminPage';
// function App() {
//   let routing = createBrowserRouter([
//     {
//       path: '',
//       element: <Layout />, // your main site layout
//       children: [
//         { index: true, element: <Welcome /> },
//         { path: 'register', element: <Register /> },
//         { path: 'login', element: <Login /> },
//         {path:"main", element:<MainContent/>},
//         { path: "doctorprofile", element: <DoctorProfile /> },
//         { path: 'article', element: <Article /> },
//         { path: '*', element: <Notfound /> },
//         {path:"admin", element:<AdminPage/>},
//       ],
//     },
//   ]);
//   const [count, setCount] = useState(0)

//   return <RouterProvider router={routing}></RouterProvider>
// }

// export default App

import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Welcome from './components/Welcome/Welcome';
import Article from './components/Article/Article';
import Notfound from './components/Notfound/Notfound'
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import DoctorProfile from './components/DoctorProfile/DoctorProfile';
import MainContent from './components/MainContent/MainContent';
import AdminPage from './components/AdminPage/AdminPage';
import AuthProvider from './Context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import ResetPassword from './components/ResetPassword/ResetPassword';

const routing = createBrowserRouter([
  {
    path: '',
    element: <Layout />,
    children: [
      // 🌐 Public Routes
      { index: true, element: <Welcome /> },
      { path: 'register', element: <Register /> },
      { path: 'login', element: <Login /> },
      { path: 'reset-password', element: <ResetPassword/> },
      { path: 'article', element: <Article /> },
      { path: '*', element: <Notfound /> },

      // 🔒 Admin Only Routes
      {
        path: "admin",
        element: (
          <ProtectedRoute allowedRole="Admin">
            <AdminPage />
          </ProtectedRoute>
        )
      },

      // 🔒 Doctor Only Routes
      {
        path: "doctorprofile",
        element: (
          <ProtectedRoute allowedRole="Doctor">
            <DoctorProfile />
          </ProtectedRoute>
        )
      },
      {
        path: "main",
        element: (
          <ProtectedRoute allowedRole="Doctor">
            <MainContent />
          </ProtectedRoute>
        )
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routing} />
    </AuthProvider>
  );
}

export default App