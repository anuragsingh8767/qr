import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './RegisterMember.css';

function RegisterMember() {
  const [users, setUsers] = useState([]);
  const [emailStatus, setEmailStatus] = useState({});
  const qrCodeRefs = useRef({});

  useEffect(() => {
    fetch('http://localhost:5001/users')
      .then(response => response.json())
      .then(data => {
        // Set default attendance to 'Absent'
        const usersWithDefaultAttendance = data.map(user => ({
          ...user,
          Attendance: user.Attendance || 'Absent'
        }));
        setUsers(usersWithDefaultAttendance);
      })
      .catch(error => console.error('Error fetching users:', error));
  }, []);

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

  const sendWhatsApp = (mobile, qrCodeUrl) => {
    console.log('Sending WhatsApp to:', mobile); // Debug log
    fetch('http://localhost:5001/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mobile, qrCodeUrl })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('WhatsApp link:', data.whatsappResponse); // Debug log
          alert('QR code sent via WhatsApp');
        } else {
          console.error('Error:', data.error); // Debug log
        }
      })
      .catch(error => console.error('Error sending WhatsApp message:', error));
  };

  const downloadQRCode = (userId) => {
    const canvas = qrCodeRefs.current[userId];
    if (!canvas) {
      console.error('QR code canvas not found for user:', userId);
      return;
    }
    const scale = 4; // Increase the scale for higher resolution
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

  const deleteUser = (userId) => {
    console.log(`Deleting user with ID: ${userId}`); // Debug log
    fetch(`http://localhost:5001/delete-user/${userId}`, {
      method: 'DELETE',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Delete response:', data); // Debug log
        if (data.success) {
          setUsers(users.filter(user => user.id !== userId && user._id !== userId));
          console.log(`User ${userId} deleted successfully`);
        } else {
          console.error(`Error deleting user ${userId}:`, data.message);
        }
      })
      .catch(error => console.error(`Error deleting user ${userId}:`, error));
  };

  return (
    <div className="register-member">
      <Link to="/" className="back-button">Back to Main Page</Link>
      <h1>Registered Members</h1>
      <table className="user-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Batch</th>
            <th>Mobile</th>
            <th>Working</th>
            <th>Address</th>
            <th>Attendance</th>
            <th>QR Code</th>
            <th>Actions</th>
            <th>Email Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={index}>
              <td>{user.Name}</td>
              <td>{user.Email}</td>
              <td>{user.Batch}</td>
              <td>{user.Mobile}</td>
              <td>{user.Working}</td>
              <td>{user.Address}</td>
              <td>{user.Attendance}</td>
              <td>
                <QRCodeCanvas
                  value={user.qrCodeUrl}
                  size={128}
                  level={"H"}
                  includeMargin={true}
                  ref={el => qrCodeRefs.current[user.id || user._id] = el}
                />
              </td>
              <td>
                <button onClick={() => sendEmail(user.Email, user.qrCodeUrl, user.id || user._id)}>Email</button>
                <button onClick={() => sendWhatsApp(user.Mobile, user.qrCodeUrl)}>WhatsApp</button>
                <button onClick={() => downloadQRCode(user.id || user._id)}>Download QR</button>
                <button onClick={() => deleteUser(user.id || user._id)}>Delete</button>
              </td>
              <td>{emailStatus[user.id || user._id] || 'Not Sent'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RegisterMember;