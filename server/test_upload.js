const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
  try {
    // Note: Assuming a hardcoded order ID and a dummy image file.
    // Ensure you have a valid token if you want to test auth,
    // but we can also just let it fail at auth to see if the server crashes before.
    
    // For now we just want to create a dummy image to upload
    const dummyPath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(dummyPath, 'fake image content');

    const form = new FormData();
    form.append('receipt', fs.createReadStream(dummyPath));

    console.log('Sending request to upload proof...');
    
    // Provide a valid order ID from the user's message: 69b36aef71cd98fb037cf213
    const response = await axios.put('http://localhost:5000/api/orders/69b36aef71cd98fb037cf213/proof', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('API Error Response:', error.response.status, error.response.data);
    } else {
      console.error('Network/Server Error:', error.message);
    }
  }
}

testUpload();
