import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';
import './QrCodeGenerator.css';

const QrCodeGenerator = () => {
  const [userData, setUserData] = useState({
    Name: '',
    Email: '',
    Mobile: '',
    Address: '',
    Attendance: 'Absent',
    qrCodeUrl: ''
  });

  const [qrCodes, setQrCodes] = useState([]);
  const [emailStatus, setEmailStatus] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const qrCodeRefs = useRef({});

  useEffect(() => {
    axios.get('http://localhost:5001/users')
      .then(response => setQrCodes(response.data))
      .catch(error => console.error('Error fetching QR codes:', error));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUserData({ ...userData, qrCodeUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateQRCode = () => {
    const qrData = JSON.stringify({
      Name: userData.Name,
      Email: userData.Email,
      Mobile: userData.Mobile,
      Address: userData.Address,
      Attendance: userData.Attendance,
      qrCodeUrl: userData.qrCodeUrl
    });
    const qrCodeUrl = `http://localhost:5001/mark-attendance?qrData=${encodeURIComponent(qrData)}`;
    const newQrCode = { ...userData, qrCodeUrl };
    axios.post('http://localhost:5001/add', newQrCode)
      .then(response => {
        setQrCodes([...qrCodes, newQrCode]);
        console.log(response.data);
      })
      .catch(error => console.error('Error adding QR code:', error));
  };

  const sendEmail = (email, qrCodeUrl, userId) => {
    console.log(`Sending email to ${email} for user ${userId}`); // Debug log
    fetch('http://localhost:5001/send-email', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, qrCodeUrl })
    })
      .then(response => response.text())
      .then(data => {
        console.log(`Email sent to ${email} for user ${userId}: ${data}`); // Debug log
        setEmailStatus(prevStatus => ({
          ...prevStatus,
          [userId]: 'Sent'
        }));
      })
      .catch(error => {
        console.error(`Error sending email to ${email} for user ${userId}:`, error);
        setEmailStatus(prevStatus => ({
          ...prevStatus,
          [userId]: 'Unable to send'
        }));
      });
  };

  const deleteUser = (userId) => {
    axios.delete(`http://localhost:5001/delete-user/${userId}`)
      .then(response => {
        if (response.data.success) {
          setQrCodes(qrCodes.filter(qrCode => qrCode._id !== userId));
          console.log(`User ${userId} deleted successfully`);
        } else {
          console.error(`Error deleting user ${userId}:`, response.data.message);
        }
      })
      .catch(error => console.error(`Error deleting user ${userId}:`, error));
  };

  const downloadQRCode = (userId) => {
    const canvas = qrCodeRefs.current[userId];
    if (!canvas) {
      console.error('QR code canvas not found for user:', userId);
      return;
    }
    const scale = 10; // Increase the scale for higher resolution
    const width = canvas.width * scale;
    const height = canvas.height * scale;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    const pngFile = tempCanvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngFile;
    downloadLink.download = `${userId}_qrcode.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const filteredQrCodes = qrCodes.filter(qrCode => 
    qrCode.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    qrCode.Email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <h1>QR Code Generator</h1>
      <form className="qr-form">
        <div className="form-group">
          <label>Name:</label>
          <input type="text" name="Name" value={userData.Name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input type="email" name="Email" value={userData.Email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Mobile:</label>
          <input type="tel" name="Mobile" value={userData.Mobile} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Address:</label>
          <textarea name="Address" value={userData.Address} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Photograph:</label>
          <input type="file" name="qrCodeUrl" onChange={handleFileChange} accept="image/*" required />
        </div>
        <button type="button" onClick={generateQRCode}>Generate QR Code</button>
      </form>

      <h2>Generated QR Codes</h2>
      <input
        type="text"
        placeholder="Search by name or email"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      <div className="table-container">
        <table className="qr-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Address</th>
              <th>QR Code</th>
              <th>Actions</th>
              <th>Email Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredQrCodes.map((qrCode, index) => (
              <tr key={index}>
                <td>{qrCode.Name}</td>
                <td>{qrCode.Email}</td>
                <td>{qrCode.Mobile}</td>
                <td>{qrCode.Address}</td>
                <td>
                  <QRCodeCanvas
                    value={qrCode.qrCodeUrl}
                    size={128}
                    level={"H"}
                    includeMargin={true}
                    ref={el => qrCodeRefs.current[qrCode._id] = el}
                  />
                </td>
                <td>
                  <button onClick={() => sendEmail(qrCode.Email, qrCode.qrCodeUrl, qrCode._id)}>Email</button>
                  <button onClick={() => sendWhatsApp(qrCode.qrCodeUrl)}>WhatsApp</button>
                  <button onClick={() => downloadQRCode(qrCode._id)}>Download QR</button>
                  <button onClick={() => deleteUser(qrCode._id)}>Delete</button>
                </td>
                <td>{emailStatus[qrCode._id] || 'Not Sent'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="navigation-buttons">
        <Link to="/" className="navigate-button">Back to Main Page</Link>
        <Link to="/qr-code-scanner" className="navigate-button">Go to QR Code Scanner</Link>
      </div>
    </div>
  );
};

export default QrCodeGenerator;