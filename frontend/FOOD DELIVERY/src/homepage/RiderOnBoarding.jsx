import { useState } from 'react';
import './RiderOnBoarding.css';

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
          <span className="panda-emoji">🐼</span>
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
              {phaseStatus.phase1 === 'complete' && <span className="check-mark">✓</span>}
            </div>
            <div className="phase-emoji">📋</div>
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
              {phaseStatus.phase2 === 'locked' && <span className="lock-emoji">🔒</span>}
              {phaseStatus.phase2 === 'complete' && <span className="check-mark">✓</span>}
            </div>
            <div className="phase-emoji">📋</div>
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
              {phaseStatus.phase3 === 'locked' && <span className="lock-emoji">🔒</span>}
              {phaseStatus.phase3 === 'complete' && <span className="check-mark">✓</span>}
            </div>
            
            {/* Only show emoji and label when form is NOT showing */}
            {!showPhase3Form && (
              <>
                <div className="phase-emoji">📄</div>
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
              {phaseStatus.phase4 === 'locked' && <span className="lock-emoji">🔒</span>}
            </div>
            <div className="phase-emoji">📑</div>
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