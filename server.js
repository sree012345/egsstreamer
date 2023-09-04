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
    if(command != undefined){
      command.kill('SIGINT'); // Terminate FFmpeg process
    }
  });

  socket.on('error', (error) => {
    // Handle the error
    console.error('Socket error:', error);
  });
  socket.on('videoChunk', (stream,streamURL) => {
    console.log("videoChunk",stream)
    // videoStream.write(stream);
    if (Buffer.isBuffer(stream)) {
      // Data is a valid buffer
      if (videoStream.writable) {
        videoStream.write(stream);
        console.error('writing Video stream');
      } else {
        console.error('Video stream is not writable.');
      }
    } else {
      console.error('Invalid data format. Expected a buffer.');
    }
    // videoStream.pipe(command.stdin);

    // videoStream.on('error', (error) => {
    //   console.error('videoStream error:', error);
    // });
    // // Log the number of bytes written to the videoStream
    // videoStream.on('data', (chunk) => {
    //   console.log('Bytes written to videoStream:', chunk.length);
    // });

    // videoStream.on('end', () => {
    //   console.log('Video strea end:');
    // });

    // videoStream.on('error', (error) => {
    //   console.log('Video stream error:',error);
    // });

  })

  videoStream.on('drain', () => {
    console.log('Video stream drained');
    videoStream.resume();
  });

  videoStream.on('finish', () => {
    console.log('Video stream finished writing');
    videoStream.destroy();
  });

  videoStream.on('error', (error) => {
    console.error('Video stream error:', error);
  });

  videoStream.setMaxListeners(1000);

  socket.on('startStreamingToYouTube',()=>{
    startStreaming()
  })

let command;
// Function to start streaming to YouTube using FFmpeg
const startStreaming = (rtmpUrl) => {
  // const rtmpUrl = "rtmp://live.twitch.tv/app/live_938994094_leJ6Skyqg8bdsWyia5YBXuQ1VkSb69"
  // const rtmpUrl = 'rtmp://a.rtmp.youtube.com/live2/8mg7-ze8d-b6ps-ck6t-5mur';
  // const rtmpUrl = "rtmps://live-api-s.facebook.com:443/rtmp/FB-122100403328001814-0-Aby4F71qXw4JlfAn"
  // const rtmpUrl = "rtmps://fa723fc1b171.global-contribute.live-video.net/sk_us-west-2_EjpVaJb4OyJe_dd3u67DhkmFuJzlLGoSrmFXcZ96xpz"
  
  console.log('Video Streaming Started');
  // Create an FFmpeg command and set the input stream
  command = spawn('ffmpeg', [
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
};
});

// Start the server
server.listen(3412, () => {
  console.log('Socket server listening on port 3412');
});