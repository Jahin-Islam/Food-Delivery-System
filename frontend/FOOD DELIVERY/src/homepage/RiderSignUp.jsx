import { useState } from "react";
import "./RiderSignUp.css";

const RiderSignUp = ({ onSignUpSuccess, onRiderOnBoarding }) => {
  const [formData, setFormData] = useState({
    city: "",
    vehicle: "",
    name: "",
    surname: "",
    phone: "",
    email: "",
    isOver18: "",
    privacyAccepted: false,
  });

  const cities = [
    "Dhaa-Gulshan/Tejgaon",
    "Dhaka-Dhanmondi",
    "Dhaka-Mirpur",
    "Chittagong",
    "Sylhet",
  ];

  const vehicles = ["Motorbike", "Bi-Cycle"];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.city ||
      !formData.vehicle ||
      !formData.name ||
      !formData.phone ||
      !formData.email ||
      !formData.isOver18
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (!formData.privacyAccepted) {
      alert("Please accept the Rider Privacy Statement");
      return;
    }

    onSignUpSuccess({
      ...formData,
      type: "rider",
    });
  };

  return (
    <div className="rider-signup-page">
      {/* Header */}
      <header className="rider-header">
        <div className="rider-logo">
          <span className="panda-icon">🐼</span>
          <span className="logo-text">foodpanda</span>
        </div>
        <div className="language-btns">
          <button className="lang-btn active">EN</button>
          <button className="lang-btn">BN</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="rider-content">
        {/* Left Side */}
        <div className="rider-left">
          <div className="hero-section">
            <h1>Sign up today and be a part of the foodpanda rider family!</h1>
            <p>There is an opportunity to earn up to 25,000 Taka.</p>
          </div>

          <div className="info-card">
            <h2>Complete your application in 4 steps:</h2>
            <div className="card-body">
              <div className="steps">
                <p>1. Create your profile</p>
                <p>2. Fill in your personal information</p>
                <p>3. Provide your vehicle information</p>
                <p>4. Agree to our service agreement</p>
              </div>
              <div className="rider-image">
                <div className="image-placeholder"></div>
              </div>
            </div>
            <div className="buildings">
              <div className="building"></div>
              <div className="building"></div>
              <div className="building"></div>
              <div className="building"></div>
              <div className="building"></div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="rider-right">
          <div className="form-container">
            <h2>Create your profile</h2>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select your city</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <select
                  name="vehicle"
                  value={formData.vehicle}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Choose your vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle} value={vehicle}>
                      {vehicle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Name *"
                  className="input-field"
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  placeholder="Surname"
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="phone-wrapper">
                  <div className="country-code">+880</div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field phone-field"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="input-field"
                  required
                />
              </div>

              <div className="input-group">
                <div className="question-box">
                  <p className="question-text">Are you over 18 ?</p>
                  <div className="radio-options">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="isOver18"
                        value="yes"
                        checked={formData.isOver18 === "yes"}
                        onChange={handleChange}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="isOver18"
                        value="no"
                        checked={formData.isOver18 === "no"}
                        onChange={handleChange}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <div className="checkbox-box">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="privacyAccepted"
                      checked={formData.privacyAccepted}
                      onChange={handleChange}
                    />
                    <span>
                      I have read and understand the{" "}
                      <a href="#">Rider Privacy Statement</a>.
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="submit-button"
                onClick={onRiderOnBoarding}
              >
                SUBMIT
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderSignUp;
