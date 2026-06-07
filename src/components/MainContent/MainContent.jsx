import React, { useRef } from 'react'
import Style from './MainContent.module.css'
import Home from '../Home/Home'
import Cases from '../Cases/Cases'
import Reports from '../Reports/Reports'
import Appointments from '../Appointments/Appointments'
import DoctorPatients from '../DoctorPatients/DoctorPatients'

export default function MainContent() {
  const appointmentsRef = useRef(null)

  const scrollToAppointments = () => {
    appointmentsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={Style.mainContainer}>

      {/* Intro Section */}
      <section className={`${Style.section} ${Style.introSection} siteDashboardIntro`}>
        <div className={Style.introContent}>
          <div className={Style.badge}>AI-Powered Platform</div>
          <h1>
            Smart Medical <span className={Style.highlight}>Dashboard</span>
          </h1>
          <p>Your intelligent assistant for patients, reports, and appointments</p>

          <div className={Style.actions}>
            <button className={Style.btnPrimary} onClick={scrollToAppointments}>
              Get Started
            </button>
          </div>
        </div>

        <div className={Style.floatingCards}>
          <div className={`${Style.card} ${Style.card1}`}>
            <i className="fa-solid fa-heart-pulse"></i>
            <span>AI Analysis</span>
          </div>
          <div className={`${Style.card} ${Style.card2}`}>
            <i className="fa-solid fa-file-medical"></i>
            <span>Report Ready</span>
          </div>
          <div className={`${Style.card} ${Style.card3}`}>
            <i className="fa-solid fa-calendar-check"></i>
            <span>Appointment Set</span>
          </div>
        </div>
      </section>

      {/* Appointments Section */}
      <section
        ref={appointmentsRef}
        className={`${Style.section} ${Style.appointmentsSection} appointmentsection`}
      >
        <Appointments />
      </section>

      {/* Cases Section */}
      <section className={`${Style.section} ${Style.casesSection} casessection`}>
        <Cases />
      </section>

      {/* Home Section */}
      <section className={`${Style.section} ${Style.homeSection} homesection`}>
        <Home />
      </section>

      {/* Reports Section */}
      <section className={`${Style.section} ${Style.reportsSection} reportsection`}>
        <Reports />
      </section>

      {/* Patients Section */}
      <section className={`${Style.section} ${Style.patientsSection} patientssection`}>
        <DoctorPatients />
      </section>

    </div>
  )
}