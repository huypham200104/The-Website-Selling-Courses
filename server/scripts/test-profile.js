const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const http = require('http');

async function testUpdateProfile() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Find any user
  const user = await User.findOne();
  if (!user) {
    console.log('No user found in DB');
    process.exit(1);
  }

  console.log('Minting token for user:', user._id);
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );

  console.log('Calling PUT /api/auth/profile...');
  
  const postData = JSON.stringify({ name: user.name + ' Updated' });
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      console.log('BODY: ', rawData);
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

testUpdateProfile();
