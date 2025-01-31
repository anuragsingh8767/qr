import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import './QrCodeScanner.css'; // Import the CSS file

const QrCodeScanner = () => {
  const [scanResult, setScanResult] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('Absent');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { fps: 10, qrbox: 250 },
      /* verbose= */ false
    );

    scanner.render(handleScan, handleError);

    return () => {
      scanner.clear().catch(error => {
        console.error('Failed to clear scanner. ', error);
      });
    };
  }, []);

  const handleScan = (data) => {
    if (data) {
      setScanResult(data);
      // Call the backend to mark the attendance and update the attendance status
      fetch('http://localhost:5001/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qrData: data })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((result) => {
          if (result.success) {
            setAttendanceStatus('Present');
          } else {
            console.error('Error marking attendance:', result.message);
          }
        })
        .catch(error => console.error('Error marking attendance:', error));
    }
  };

  const handleError = (err) => {
    console.error('QR Code Scan Error:', err);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCode.scanFile(file, true)
        .then((decodedText) => {
          handleScan(decodedText);
        })
        .catch((err) => {
          console.error('Error scanning file:', err);
        });
    }
  };

  return (
    <div className="scanner-container">
      <h1>QR Code Scanner</h1>
      <div id="reader" style={{ width: '100%' }}></div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <p>Scanned Result: {scanResult}</p>
      <p>Attendance Status: {attendanceStatus}</p>
    </div>
  );
};

export default QrCodeScanner;