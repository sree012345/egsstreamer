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

  // Event triggered when receiving a video chunk
  socket.on('videoChunk', (data,streamUrl) => {
    // Send the video chunk to the streaming server
    console.log("videoChunk",data,streamUrl)

    const rtmpUrl = streamUrl//'rtmp://a.rtmp.youtube.com/live2/8mg7-ze8d-b6ps-ck6t-5mur';

    // Create an FFmpeg command and set the input stream
    const command = ffmpeg()
    .input(videoStream)
    .inputFormat('mp4') // Set the input format if required
    .outputOptions('-c:v libx264', '-preset veryfast', '-tune zerolatency', '-c:a aac', '-b:a 128k', '-f flv')
    .output(rtmpUrl)
    .output('-'); // Output to stdout
    videoStream.setMaxListeners(100);
    // command.on('start', () => {
    //   console.log('RTMP URL is active and streaming can be started.');
    //   resolve(true);
    // }).on('error', (err) => {
    //   console.error('RTMP URL is not active or streaming cannot be started:', err.message);
    //   resolve(false);
    // }).on('end', () => {
    //   console.log('Connection test ended.');
    //   resolve(false);
    // });
  // Spawn the FFmpeg process with the correct arguments
  const ffmpegProcess = spawn('ffmpeg', ['-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-c:a', 'aac', '-b:a', '128k', '-f', 'flv', rtmpUrl]);

  // Pipe the input stream to the FFmpeg process
  videoStream.pipe(ffmpegProcess.stdin);

    // Handle FFmpeg process events
    ffmpegProcess.on('error', (error) => {
      console.error('FFmpeg process encountered an error:', error);
    });

    ffmpegProcess.on('exit', (code, signal) => {
      console.log('FFmpeg process exited with code:', code, 'and signal:', signal);
    });

    // Send video chunks to the stream
    // Replace `chunk` with your video chunk data
    videoStream.write(data);
  });

  // Event triggered when the client disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    videoStream.end();
  });

  socket.on('error', (error) => {
    // Handle the error
    console.error('Socket error:', error);
  });

  // Listen for 'video-chunk' event from the socket server
// socket.on('videoChunk', (chunkData,stearmURL) => {
//   console.log("videoChunk",chunkData)
//   const stramURL = 'rtmp://a.rtmp.youtube.com/live2/8mg7-ze8d-b6ps-ck6t-5mur'
//   const { chunkIndex, data } = chunkData;
//   const chunkFilePath = `chunk_${chunkIndex}.mp4`;
//   const webmFilePath = 'streamedVideo.webm'
//   // Save the video chunk to a temporary file
//   fs.appendFileSync(webmFilePath, data);
//   // fs.writeFileSync(chunkFilePath, data, 'binary');

//   // Stream the chunk to YouTube
//   // streamChunkToYouTube(chunkFilePath,stramURL)
//   //   .then(() => {
//   //     console.log(`Chunk ${chunkIndex} streamed successfully.`);
//   //     fs.unlinkSync(chunkFilePath); // Remove the temporary chunk file
//   //   })
//   //   .catch((err) => {
//   //     console.error(`Error while streaming chunk ${chunkIndex} to YouTube:`, err);
//   //     fs.unlinkSync(chunkFilePath); // Remove the temporary chunk file on error
//   //   });
//   const ffmpegCommand = `ffmpeg -re -i ${webmFilePath} -c:v libvpx -b:v 1M -c:a libvorbis -f flv ${stramURL}`;

//   const ffmpegProcess = spawn(ffmpegCommand, { shell: true });

//   ffmpegProcess.stdout.on('data', (data) => {
//     console.log(`ffmpeg stdout: ${data}`);
//   });
  
//   ffmpegProcess.stderr.on('data', (data) => {
//     console.error(`ffmpeg stderr: ${data}`);
//   });
  
//   ffmpegProcess.on('close', (code) => {
//     console.log(`ffmpeg process exited with code ${code}`);
//   });
  
//   ffmpegProcess.on('error', (error) => {
//     console.error('ffmpeg process error:', error);
//   });

// });

// const streamChunkToYouTube = (inputPath,stramURL) => {
//   return new Promise((resolve, reject) => {
//     // const command = ffmpeg(inputPath)
//     //   .videoCodec('libx264')
//     //   .audioCodec('aac')
//     //   .outputOptions([
//     //     '-preset veryfast',
//     //     '-tune zerolatency',
//     //     '-g 60',
//     //     '-b:v 3000k',
//     //     '-bufsize 6000k',
//     //   ])
//     //   .format('flv')
//     //   .output(stramURL);

//     const command = ffmpeg()
//     .input(inputPath) // Specify input file directly instead of using ffmpeg(inputPath)
//     .inputFormat('mp4') // Explicitly set the input format
//     .videoCodec('libx264')
//     .audioCodec('aac')
//     .outputOptions([
//       '-preset veryfast',
//       '-tune zerolatency',
//       '-g 60',
//       '-b:v 3000k',
//       '-bufsize 6000k',
//     ])
//     .format('flv')
//     .output(stramURL);

//     command.on('start', () => {
//       console.log(`Streaming chunk ${inputPath} to YouTube...`);
//     });

//     command.on('end', () => {
//       resolve();
//     });

//     command.on('error', (err, stdout, stderr) => {
//       console.error('Error while streaming chunk:', err.message);
//       console.error('ffmpeg stdout:', stdout);
//       console.error('ffmpeg stderr:', stderr);
//       reject(err);
//     });

//     command.run();
//   });
// };
});

// Start the server
server.listen(3000, () => {
  console.log('Socket server listening on port 3000');
});