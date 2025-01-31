const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const xlsx = require('xlsx');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const app = express();
const axios = require('axios');
const port = process.env.PORT || 5001; // Ensure this port is not conflicting

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const uri = 'mongodb+srv://vtechsystemnagpur:vtechsystemnagpur@qr-gen-cluster.pnfdz.mongodb.net/?retryWrites=true&w=majority&appName=qr-gen-cluster';
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

const qrCodeSchema = new mongoose.Schema({
  Name: String,
  Email: String,
  Mobile: String,
  Address: String,
  Attendance: { type: Boolean, default: false },
  qrCodeUrl: String,
  qrData: String // Ensure this field is unique for each user
});

const QrCode = mongoose.model('QrCode', qrCodeSchema);

// Route to mark attendance
app.post('/mark-attendance', (req, res) => {
  const { qrData } = req.body;
  QrCode.findOneAndUpdate({ qrData }, { Attendance: true }, { new: true })
    .then(updatedEntry => {
      if (updatedEntry) {
        res.json({ success: true, message: 'Attendance marked as present' });
      } else {
        res.status(404).json({ success: false, message: 'QR Code not found' });
      }
    })
    .catch(err => {
      console.error('Error:', err);
      res.status(400).json({ success: false, message: 'Error: ' + err });
    });
});

// Route to upload Excel file and generate QR codes
app.post('/upload-excel', (req, res) => {
  const filePath = 'samplesheet1.xlsx'; // Update with the actual file path
  readExcelAndSaveData(filePath)
    .then(() => res.json('Data saved and QR codes generated'))
    .catch(err => res.status(400).json('Error: ' + err));
});

const readExcelAndSaveData = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  for (const entry of data) {
    const qrData = JSON.stringify({
      Name: entry.Name,
      Email: entry.Email,
      Mobile: entry.Mobile,
      Address: entry.Address
    });

    const newQrCode = new QrCode({
      Name: entry.Name,
      Email: entry.Email,
      Mobile: entry.Mobile,
      Address: entry.Address,
      qrData,
      qrCodeUrl: `http://localhost:5001/mark-attendance?qrData=${encodeURIComponent(qrData)}`
    });

    await newQrCode.save();
  }
};

// Route to delete user by ID
app.delete('/delete-user/:id', (req, res) => {
  const userId = req.params.id;
  QrCode.findByIdAndDelete(userId)
    .then(deletedEntry => {
      if (deletedEntry) {
        console.log('User data deleted for:', deletedEntry);
        res.json({ success: true, message: 'User data deleted' });
      } else {
        console.log('User not found');
        res.status(404).json({ success: false, message: 'User not found' });
      }
    })
    .catch(err => {
      console.log('Error:', err);
      res.status(400).json({ success: false, message: 'Error: ' + err });
    });
});

// Route to add new QR code and user data
app.post('/add', (req, res) => {
  const { Name, Email, Mobile, Address } = req.body;
  const qrData = JSON.stringify({ Name, Email, Mobile, Address });
  const qrCodeUrl = `http://localhost:5001/mark-attendance?qrData=${encodeURIComponent(qrData)}`;

  const newQrCode = new QrCode({
    Name,
    Email,
    Mobile,
    Address,
    qrData,
    qrCodeUrl,
    Attendance: false
  });

  newQrCode.save()
    .then(() => res.json('QR Code and user data added'))
    .catch(err => res.status(400).json('Error: ' + err));
});

// Route to fetch all users with QR codes
app.get('/users', (req, res) => {
  QrCode.find()
    .then(users => res.json(users))
    .catch(err => res.status(400).json('Error: ' + err));
});

// Route to send email with QR code
app.post('/send-email', async (req, res) => {
  try {
    const { email, qrCodeUrl } = req.body;
    await sendEmailWithQRCode(email, qrCodeUrl);
    res.send('Email sent successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error sending email');
  }
});

// Function to send email with QR code
const sendEmailWithQRCode = async (email, qrData) => {
  try {
    // Generate QR code as base64 string
    const qrBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 1,
      margin: 2,
      width: 500
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'anuragvsingh999@gmail.com',
        pass: 'shvt chpf cnxf sudo'
      }
    });

    const mailOptions = {
      from: 'anuragvsingh999@gmail.com',
      to: email,
      subject: 'Your QR Code for कृतज्ञता 2025',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: #333;">कृतज्ञता 2025</h2>
          <p style="color: #666;">Your QR code is attached to this email.</p>
          <p style="color: #666;">Please download and keep it safe for attendance.</p>
        </div>
      `,
      attachments: [{
        filename: 'YourQRCode.png',
        content: qrBuffer,
        contentType: 'image/png'
      }]
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Route to send WhatsApp with QR code
app.post('/send-whatsapp', async (req, res) => {
  try {
    console.log('Received WhatsApp request:', req.body); // Debug log

    const { mobile, qrCodeUrl } = req.body;
    console.log("Mobile and qrcodeurl:", mobile, qrCodeUrl); // Debug log
    
    if (!mobile || !qrCodeUrl) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number and QR code URL are required'
      });
    }

    const whatsappResponse = await sendWhatsAppWithQRCode(mobile, qrCodeUrl);
    res.json({ 
      success: true,
      whatsappResponse,
      message: 'QR code sent via WhatsApp'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Function to send WhatsApp with QR code
const sendWhatsAppWithQRCode = async (mobile, qrData) => {
  try {
    if (!mobile) {
      throw new Error('Mobile number is required');
    }

    const formattedMobile = mobile.toString().replace(/\D/g, '');
    
    // Generate QR code as PNG buffer
    const qrCodeBuffer = await generateQRCodePNG(qrData);

    // Convert QR code buffer to base64
    const qrCodeBase64 = qrCodeBuffer.toString('base64');

    // WhatsApp Business API endpoint
    const whatsappApiUrl = 'https://backend.aisensy.com/campaign/t1/api/v2';

    // WhatsApp Business API credentials
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OTNiMWFjOWUzNDAxMDg5NWE1Yzg0NiIsIm5hbWUiOiJ2LXRlY2ggc3lzdGVtIiwiYXBwTmFtZSI6IkFpU2Vuc3kiLCJjbGllbnRJZCI6IjY3OTNiMWFjOWUzNDAxMDg5NWE1Yzg0MSIsImFjdGl2ZVBsYW4iOiJGUkVFX0ZPUkVWRVIiLCJpYXQiOjE3Mzc3MzI1MjR9.ioKiVOn3gsR8FGjXZAdfrf7ojVx5ncwkZr3YlTUOW0E';

    // Create message payload
    const payload = {
      apiKey: apiKey,
      campaignName: 'QRCodeCampaign',
      destination: formattedMobile,
      userName: 'YourUserName',
      source: 'YourSource',
      media: {
        url: `data:image/png;base64,${qrCodeBase64}`,
        filename: 'qrcode.png'
      },
      templateParams: [],
      tags: [],
      attributes: {
        attribute_name: 'value'
      }
    };

    // Send message using the new API endpoint
    const response = await axios.post(whatsappApiUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to generate QR code as PNG buffer
const generateQRCodePNG = async (data) => {
  try {
    const qrBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      type: 'png',
      quality: 1,
      margin: 4,
      width: 500,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrBuffer;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});