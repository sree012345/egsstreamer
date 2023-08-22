const express = require('express');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');

const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const { spawn } = require('child_process');

const cors = require('cors');
// Create Express app
const app = express();

app.use(cors());

const server = http.createServer(app);

const videoStream = new PassThrough();

// Set up Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: 'https://localhost:3001', // Replace with the appropriate client origin
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

// Event triggered when a client connects
io.on('connection', (socket) => {
  console.log('New client connected');
  // Event triggered when the client disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    videoStream.end();
  });

  socket.on('error', (error) => {
    // Handle the error
    console.error('Socket error:', error);
  });
  socket.on('videoChunk', (stream,streamURL) => {
    console.log("videoChunk",stream)
    videoStream.write(stream);
  })

  socket.on('startStreamingToYouTube',()=>{
    startStreamingToYouTube()
  })
  
// Function to start streaming to YouTube using FFmpeg
const startStreamingToYouTube = () => {
  const rtmpUrl = 'rtmp://a.rtmp.youtube.com/live2/8mg7-ze8d-b6ps-ck6t-5mur';
  console.log('Video Streaming Started');
  // Create an FFmpeg command and set the input stream
  const command = spawn('ffmpeg', [
    '-i', // Input from stdin
    '-', // Use hyphen to specify stdin as input source
    '-c:v', 'libx264', // Video codec
    '-preset', 'ultrafast', // Video encoding preset
    '-tune', 'zerolatency', // Tune for real-time streaming
    '-c:a', 'aac', // Audio codec
    '-b:a', '128k', // Audio bitrate
    '-vf', 'scale=1280:720', // Adjust the resolution as needed
    '-f', 'flv', // Output format (FLV for YouTube streaming)
    rtmpUrl, // RTMP URL for YouTube live stream
  ]);

  // Pipe the input stream to the FFmpeg process
  videoStream.pipe(command.stdin);

  // Handle FFmpeg process events
  command.on('error', (error) => {
    console.error('FFmpeg process encountered an error:', error);
  });
  command.on('exit', (code, signal) => {
    console.log('FFmpeg process exited with code:', code, 'and signal:', signal);
  });
  command.on('spawn', () =>{
    console.log('FFmpeg spawn progressing');
  });
  command.on('message', (message,sendHandle) =>{
    console.log('FFmpeg message received',message,sendHandle);
  });
};
});

// Start the server
server.listen(3000, () => {
  console.log('Socket server listening on port 3000');
});