import { useState } from 'react';
import './RiderOnBoarding.css';
import { COLORS } from '../constants.js';

const RiderOnBoarding = ({onCompletion}) => {
  const [phaseStatus, setPhaseStatus] = useState({
    phase1: 'active',
    phase2: 'locked',
    phase3: 'locked',
    phase4: 'locked'
  });
  
  const [showPhase2Modal, setShowPhase2Modal] = useState(false);
  const [showPhase3Form, setShowPhase3Form] = useState(false);
  
  const [phase3Data, setPhase3Data] = useState({
    birthday: '',
    gender: '',
    address: '',
    nidNumber: '',
    nidFront: null,
    nidBack: null,
    drivingLicense: null,
    bikeRegistration: null,
    emergencyName: '',
    emergencyPhone: '',
    hearAbout: '',
    vehicle: '' // Added vehicle field
  });

  const locations = [
    {
      name: 'Dhaka Division',
      zone: 'Gulshan, Gulshan 1, Tejgaon, Banani, Badda, Bashundhara',
      address: 'Kaderia Tower (13th Floor), Plot No: J-28/8-B, Bir Uttam A.K. Khandaker Road, Dhaka-1212, beside Gausul Azam Mosque, Mohakhali TB Gate, (Opposite BRAC Center)',
      phone: '01726030466'
    },
    {
      name: 'Tangail',
      zone: 'Tangail, Sirajganj',
      address: 'Haji Rice Building (3rd Floor), Dr. M.A. Matin Road (BMW Road), Sirajganj',
      phone: '01840861151'
    },
    {
      name: 'Mymensingh',
      zone: 'Mymensingh, Kishoreganj, Jamalpur',
      address: 'Gol Pukur Par, 8/1 Mrityunjoy School Road, opposite Mrityunjoy School, Char Rastar Mor (Ground Floor of the Blue Three-Storey Building)',
      phone: '01778672757'
    }
  ];

  // Phase 1 Handler
  const handlePhase1Start = () => {
    setPhaseStatus({
      phase1: 'complete',
      phase2: 'active',
      phase3: 'locked',
      phase4: 'locked'
    });
  };

  // Phase 2 Handler
  const handlePhase2Start = () => {
    setShowPhase2Modal(true);
  };

  const handlePhase2OK = () => {
    setShowPhase2Modal(false);
    setPhaseStatus({
      phase1: 'complete',
      phase2: 'complete',
      phase3: 'active',
      phase4: 'locked'
    });
  };

  // Phase 3 Handlers
  const handlePhase3Start = () => {
    setShowPhase3Form(true);
  };

  const handlePhase3Change = (field, value) => {
    setPhase3Data(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field, file) => {
    if (file && file.size <= 10 * 1024 * 1024) {
      handlePhase3Change(field, file);
    } else {
      alert('File size must be less than 10MB');
    }
  };

  const handlePhase3Submit = () => {
    const data = phase3Data;
    if (!data.birthday || !data.gender || !data.address || !data.nidNumber || 
        !data.nidFront || !data.nidBack || !data.emergencyName || 
        !data.emergencyPhone || !data.hearAbout) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (phase3Data.vehicle === 'Motorbike' && !data.drivingLicense) {
      alert('Please upload your driving license');
      return;
    }
    
    if (phase3Data.vehicle === 'Bi-Cycle' && !data.bikeRegistration) {
      alert('Please upload your bike registration');
      return;
    }

    setShowPhase3Form(false);
    setPhaseStatus({
      phase1: 'complete',
      phase2: 'complete',
      phase3: 'complete',
      phase4: 'active'
    });
  };

  return (
    <div className="onboarding-page">
      {/* Header */}
      <header className="onboarding-header">
        <div className="header-logo">
          <span className="panda-emoji" style={{fontSize:'30px',fontWeight:'bold',color:COLORS.primary}}>fp</span>
          <span className="logo-text">foodpanda</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="onboarding-main">
        <h1 className="page-title">My progress</h1>

        {/* Phase Cards Grid */}
        <div className="phases-grid">
          {/* Phase 1 */}
          <div className="phase-box">
            <div className="phase-box-header">
              <div>
                <span className="phase-counter">1/1</span>
                <h3 className="phase-name">Phase 1</h3>
                <p className="phase-desc">Roughly 3 Minutes to complete</p>
              </div>
              {phaseStatus.phase1 === 'complete' && <span className="check-mark"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
            </div>
            <div className="phase-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg></div>
            <h4 className="phase-label">Welcome</h4>
            {phaseStatus.phase1 === 'complete' && (
              <div className="saved-badge">Submitted and saved</div>
            )}
            {phaseStatus.phase1 === 'active' && (
              <button className="phase-btn active" onClick={handlePhase1Start}>Start</button>
            )}
          </div>

          {/* Phase 2 */}
          <div className="phase-box">
            <div className="phase-box-header">
              <div>
                <span className="phase-counter">1/1</span>
                <h3 className="phase-name">Phase 2</h3>
                <p className="phase-desc">
                  {phaseStatus.phase2 === 'locked' 
                    ? 'You need to complete previous steps first' 
                    : 'Roughly 3 Minutes to complete'}
                </p>
              </div>
              {phaseStatus.phase2 === 'locked' && <span className="lock-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>}
              {phaseStatus.phase2 === 'complete' && <span className="check-mark"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
            </div>
            <div className="phase-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg></div>
            <h4 className="phase-label">Proceed to Onboarding</h4>
            {phaseStatus.phase2 === 'complete' && (
              <div className="saved-badge">Submitted and saved</div>
            )}
            {phaseStatus.phase2 === 'active' && (
              <button className="phase-btn active" onClick={handlePhase2Start}>Start</button>
            )}
            {phaseStatus.phase2 === 'locked' && (
              <button className="phase-btn disabled" disabled>Start</button>
            )}
          </div>

          {/* Phase 3 */}
          <div className="phase-box">
            <div className="phase-box-header">
              <div>
                <span className="phase-counter">1/1</span>
                <h3 className="phase-name">Phase 3</h3>
                <p className="phase-desc">
                  {phaseStatus.phase3 === 'locked' 
                    ? 'You need to complete previous steps first' 
                    : showPhase3Form ? '0 questions answered' : 'Roughly 3 Minutes to complete'}
                </p>
              </div>
              {phaseStatus.phase3 === 'locked' && <span className="lock-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>}
              {phaseStatus.phase3 === 'complete' && <span className="check-mark"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
            </div>
            
            {/* Only show emoji and label when form is NOT showing */}
            {!showPhase3Form && (
              <>
                <div className="phase-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg></div>
                <h4 className="phase-label">Document collection</h4>
              </>
            )}
            
            {/* Phase 3 Form - Shows when active */}
            {phaseStatus.phase3 === 'active' && showPhase3Form && (
              <div className="inline-form">
                <p className="form-section-title">Document collection</p>
                
                <input
                  type="date"
                  placeholder="Your Birthday (MM/DD/YYYY) *"
                  value={phase3Data.birthday}
                  onChange={(e) => handlePhase3Change('birthday', e.target.value)}
                  className="form-field"
                />

                <p className="field-label">Enter your gender *</p>
                <div className="gender-selector">
                  <button
                    className={phase3Data.gender === 'Male' ? 'gender-btn selected' : 'gender-btn'}
                    onClick={() => handlePhase3Change('gender', 'Male')}
                  >
                    Male
                  </button>
                  <button
                    className={phase3Data.gender === 'Female' ? 'gender-btn selected' : 'gender-btn'}
                    onClick={() => handlePhase3Change('gender', 'Female')}
                  >
                    Female
                  </button>
                </div>

                <textarea
                  placeholder="Present Address (House No or name/Road No. or name/Area/District) *"
                  value={phase3Data.address}
                  onChange={(e) => handlePhase3Change('address', e.target.value)}
                  className="form-field textarea-field"
                />

                <input
                  type="text"
                  placeholder="Your NID Number (National ID Number) *"
                  value={phase3Data.nidNumber}
                  onChange={(e) => handlePhase3Change('nidNumber', e.target.value)}
                  className="form-field"
                />

                <FileUploadBox
                  label="Your National ID Card Upload (Front Side) *"
                  file={phase3Data.nidFront}
                  onChange={(file) => handleFileUpload('nidFront', file)}
                />

                <FileUploadBox
                  label="Your National ID Card Upload (Back Side) *"
                  file={phase3Data.nidBack}
                  onChange={(file) => handleFileUpload('nidBack', file)}
                />

                {phase3Data.vehicle === 'Motorbike' && (
                  <FileUploadBox
                    label="Driving License Upload *"
                    file={phase3Data.drivingLicense}
                    onChange={(file) => handleFileUpload('drivingLicense', file)}
                  />
                )}

                {phase3Data.vehicle === 'Bi-Cycle' && (
                  <FileUploadBox
                    label="Bike Registration Paper Upload *"
                    file={phase3Data.bikeRegistration}
                    onChange={(file) => handleFileUpload('bikeRegistration', file)}
                  />
                )}

                <input
                  type="text"
                  placeholder="Emergency Contact Name (Father/Mother/Spouse) *"
                  value={phase3Data.emergencyName}
                  onChange={(e) => handlePhase3Change('emergencyName', e.target.value)}
                  className="form-field"
                />

                <input
                  type="tel"
                  placeholder="Emergency contact number *"
                  value={phase3Data.emergencyPhone}
                  onChange={(e) => handlePhase3Change('emergencyPhone', e.target.value)}
                  className="form-field"
                />

                <p className="field-label">Where did you hear about foodpanda? *</p>
                <div className="options-grid">
                  {['TV', 'Outdoor posters and billboards', 'Facebook', 'Friend or Family', 'Others'].map(option => (
                    <button
                      key={option}
                      className={phase3Data.hearAbout === option ? 'option-btn selected' : 'option-btn'}
                      onClick={() => handlePhase3Change('hearAbout', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button className="form-submit-btn" onClick={handlePhase3Submit}>
                  SUBMIT
                </button>
              </div>
            )}

            {phaseStatus.phase3 === 'complete' && (
              <div className="saved-badge">Submitted and saved</div>
            )}
            {phaseStatus.phase3 === 'active' && !showPhase3Form && (
              <button className="phase-btn active" onClick={handlePhase3Start}>Start</button>
            )}
            {phaseStatus.phase3 === 'locked' && (
              <button className="phase-btn disabled" disabled>Start</button>
            )}
          </div>

          {/* Phase 4 */}
          <div className="phase-box">
            <div className="phase-box-header">
              <div>
                <span className="phase-counter">1/1</span>
                <h3 className="phase-name">Phase 4</h3>
                <p className="phase-desc">You need to complete previous steps first</p>
              </div>
              {phaseStatus.phase4 === 'locked' && <span className="lock-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>}
            </div>
            <div className="phase-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
            <h4 className="phase-label">Service Agreement</h4>
            <p className="phase-info">This stage is to confirm the agreement for the terms and conditions.</p>
            {phaseStatus.phase4 === 'active' && (
              <button className="phase-btn active" onClick={onCompletion}>Start</button>
            )}
            {phaseStatus.phase4 === 'locked' && (
              <button className="phase-btn disabled" disabled >Start</button>
            )}
          </div>
        </div>
      </div>

      {/* Phase 2 Modal */}
      {showPhase2Modal && (
        <div className="popup-overlay" onClick={() => setShowPhase2Modal(false)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Proceed to Onboarding</h3>
              <button className="popup-close" onClick={() => setShowPhase2Modal(false)}>→</button>
            </div>
            <p className="popup-info">
              Come directly to the location of your choice to work as a delivery rider at foodpanda 
              Bangladesh Limited. Scroll Down & Click OK to complete the Stage.
            </p>
            <h4 className="popup-subtitle">Hub Office Address:</h4>
            {locations.map((loc, idx) => (
              <div key={idx} className="location-box">
                <h5>{loc.name}</h5>
                <p className="zone-text">Zone: {loc.zone}</p>
                <p className="address-text">{loc.address}</p>
                <p className="phone-text">Phone: {loc.phone}</p>
              </div>
            ))}
            <button className="popup-ok-btn" onClick={handlePhase2OK}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

// File Upload Component
const FileUploadBox = ({ label, file, onChange }) => {
  return (
    <div className="upload-section">
      <p className="upload-label">{label}</p>
      <div className="upload-area">
        <div className="upload-arrow">↑</div>
        <button 
          className="upload-btn" 
          onClick={() => document.getElementById(`file-${label}`).click()}
        >
          CHOOSE FILE
        </button>
        <input
          id={`file-${label}`}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files[0])}
        />
        <p className="upload-hint">.pdf, .png or .jpg, max 10MB</p>
        {file && <p className="file-name-display">{file.name}</p>}
      </div>
    </div>
  );
};

export default RiderOnBoarding;