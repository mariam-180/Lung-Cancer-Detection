import React, { useRef } from 'react'
import Style from './MainContent.module.css'
import Home from '../Home/Home'
import Cases from '../Cases/Cases'
import Reports from '../Reports/Reports'
import Appointments from '../Appointments/Appointments'
import DoctorPatients from '../DoctorPatients/DoctorPatients'

export default function MainContent() {
  const homeRef = useRef(null)

  const scrollToHome = () => {
    homeRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={Style.mainContainer}>

      {/* Intro Section */}
      <section className={`${Style.section} ${Style.introSection} siteDashboardIntro`}>
        <div className={`${Style.introContent} `}>
          <div className={Style.badge}>AI-Powered Platform</div>
          <h1>Smart Medical <span className={Style.highlight}>Dashboard</span></h1>
          <p>Your intelligent assistant for patients, reports, and appointments</p>
          {/* <div className={Style.stats}>
            <div className={Style.stat}><strong>2.4k</strong><span>Patients</span></div>
            <div className={Style.statDivider}/>
            <div className={Style.stat}><strong>98%</strong><span>Accuracy</span></div>
            <div className={Style.statDivider}/>
            <div className={Style.stat}><strong>24/7</strong><span>Support</span></div>
          </div> */}
          <div className={Style.actions}>
            <button className={Style.btnPrimary} onClick={scrollToHome}>
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

      {/* Home Section */}
      <section ref={homeRef} className={`${Style.section} ${Style.homeSection} homesection`}>
        <Home />
      </section>

      {/* Cases Section */}
      <section className={`${Style.section} ${Style.casesSection} casessection`}>
        <Cases />
      </section>
   {/* patients Section */}
      <section className={`${Style.section}  appointmentsection`}>
       <DoctorPatients/>
      </section>
      {/* Reports Section */}
      <section className={`${Style.section} ${Style.reportsSection} reportsection`}>
        <Reports />
      </section>

      {/* Appointments Section */}
      <section className={`${Style.section} ${Style.appointmentsSection} appointmentsection`}>
        <Appointments />
      </section>

    </div>
  )
}