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
    log("client connected to socket server " + socket.id);
    socket.on('device-1', (receivedData) => {
        log("received data from device: " + JSON.stringify(receivedData));
        if (!receivedData) {
            log("Undefined data");
            return;
        }
        if (!receivedData["Position"]) {
            log("Data missing position");
            return;
        }
        if (receivedData["Position"]["x"] === undefined || receivedData["Position"]["y"] === undefined || receivedData["Position"]["z"] === undefined) {
            log("Position data missing either x, y, or z");
            return;
        }
        if (!receivedData["Orientation"]) {
            log("Data missing orientation");
            return;
        }
        if (receivedData["Orientation"]["x"] === undefined || receivedData["Orientation"]["y"] === undefined || receivedData["Orientation"]["z"] === undefined || receivedData["Orientation"]["w"] === undefined) {
            log("Orientation data missing either x, y, z, or w");
            return;
        }
        if (!receivedData["Confidence"]) {
            log("Data missing confidence");
            return;
        }
        io.emit('device-data', receivedData);
    });
});

server.listen(port, () => {
    log(`Listening on the port ${port}`);
}).on('error', e => {
    console.error(e);
});
