// app.js
const faceapi = require('face-api.js');
const fs = require('fs').promises;
const path = require('path');
const { Canvas, Image, ImageData } = require('canvas');
const { MongoClient } = require('mongodb'); // Import MongoClient

// Load face-api.js models
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromDisk(path.join(__dirname, './models')),
  faceapi.nets.faceLandmark68Net.loadFromDisk(path.join(__dirname, './models')),
  faceapi.nets.faceRecognitionNet.loadFromDisk(path.join(__dirname, './models'))
])
  .then(startScript)
  .catch((error) => console.error('Error loading models:', error));

  function startScript() {
    // Set up face-api.js with Canvas
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  
    async function readFaceVectors(imagePath) {
      // Load the image using fs.promises
      const imageBuffer = await fs.readFile(imagePath);
  
      // Create an Image directly from the buffer
      const img = new Image();
      img.src = Buffer.from(imageBuffer);
  
      // Detect faces in the image
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
  
      // Extract face vectors
      const faceVectors = detections.map((detection) => detection.descriptor);
  
      return faceVectors;
    }

  async function saveFaceVectorsToMongoDB(faceVectors) {
    const uri = 'mongodb://127.0.0.1:27017/';
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('face');
      const collection = database.collection('face_vectors');

      // Insert face vectors into MongoDB collection
      const result = await collection.insertOne({ faceVectors });
      console.log('Face vectors saved to MongoDB:', result.insertedId);
    } finally {
      await client.close();
    }
  }

  // Example usage
  const imagePath = path.join(__dirname, 'santhosh.jpeg');

  readFaceVectors(imagePath)
    .then((faceVectors) => {
      console.log('Face Vectors:', faceVectors);

      // Save face vectors to MongoDB
      saveFaceVectorsToMongoDB(faceVectors);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}
