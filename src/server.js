const express = require('express');
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');

const port = process.env.PORT || 8080;
const loggingEnabled = process?.env?.LOGGING_ENABLED === "TRUE";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origins: "*:*",
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"],
        pingTimeout: 7000,
        pingInterval: 3000
    }
});

app.use(cors({origin: "*"}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

function log(text) {
    if (loggingEnabled) {
        console.log(text);
    }
}

io.on('connection', socket => {
    log("client connected to socket server: ", socket);
    socket.on('device-1', (data) => {
        log("received data from device: ", JSON.stringify(data || {}));
        io.emit('device-data', data);
    });
});

server.listen(port, () => {
    console.log(`Listening on the port ${port}`);
}).on('error', e => {
    console.error(e);
});
