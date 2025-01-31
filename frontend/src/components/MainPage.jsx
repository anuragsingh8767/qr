import React from 'react';
import { Link } from 'react-router-dom';
import companyLogo from '../assets/company_logo.png'; // Import the logo
import './MainPage.css'; // Import the CSS file

const MainPage = () => {
  return (
    <div className="full-page-container">
      <div className="content">
        <img src={companyLogo} alt="Company Logo" className="company-logo" />
        <h1 className="company-heading">कृतज्ञता 2025</h1>
        <h2 className="company-subheading">Once Again</h2>
        <p>Email: krutadnyataoncsagain@gmail.com</p>
        <p>Contact: +91 9096346492</p>
        <Link to="/qr-code-generator" className="navigate-button">Go to QR Code Generator</Link>
        <Link to="/qr-code-scanner" className="navigate-button">Go to QR Code Scanner</Link>
        <Link to="/register-member" className="navigate-button">Register Member</Link>
      </div>
    </div>
  );
};

export default MainPage;