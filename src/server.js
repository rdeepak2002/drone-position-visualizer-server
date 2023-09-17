// load environment variables
require('dotenv').config();

const {InfluxDBClient, Point} = require('@influxdata/influxdb3-client');
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const {Server} = require('socket.io');
const request = require('request');

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

function getEnvVariable(varName) {
    let result = process?.env[varName];
    if (!result) {
        console.error(`Unable to find environment variable ${varName}`);
        process.exit(1);
    }
    return result;
}

const influxDBToken = getEnvVariable('INFLUXDB_TOKEN');
const influxDBClient = new InfluxDBClient({
    host: process?.env?.INFLUXDB_HOST || 'https://us-east-1-1.aws.cloud2.influxdata.com',
    token: influxDBToken
});
const influxDBDatabase = process?.env?.INFLUXDB_DATABASE || `drone-position-visualizer-server`

const certificate = new Buffer(getEnvVariable("BASE_64_ENCODED_CERTIFICATE"), 'base64').toString();
const privateKey = new Buffer(getEnvVariable("BASE_64_ENCODED_PRIVATE_KEY"), 'base64').toString();

app.use(cors({origin: "*"}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/api/v1/lat-long-logs', async (req, res) => {
    log('Hit endpoint /api/v1/lat-long-logs');
    const query = `SELECT * FROM 'latlong' WHERE time >= now() - interval '24 hours' order by time asc LIMIT 100`
    const rows = await influxDBClient.query(query, 'drone-position-visualizer-server')
    const result = [];
    for await (const row of rows) {
        let time = new Date(row.time);
        let lat = row.lat || '';
        let long = row.long || '';
        result.push([time, lat, long]);
    }
    // console.log("Returning result to client ", result);
    res.send(result);
});

function sendCompetitionData(payload, cb) {
    const url = "https://a1m2ll84zs7epx-ats.iot.us-east-2.amazonaws.com:8443/topics/adaptitrace";
    request({
        method: "POST",
        uri: url,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        agentOptions: {
            cert: certificate,
            key: privateKey
        }
    }, function(error, httpResponse, body) {
        if (error) {
            console.error("Unable to send competition data", error, body);
        } else {
            console.debug("Successful request to competition server", body);
        }
        if (cb) {
            cb(error, httpResponse, body);
        }
    });
}

app.post('/api/v1/send-competition-data', async (req, res) => {
    sendCompetitionData(req.body, (error, httpResponse, body) => {
        if (httpResponse?.headers) {
            res.headers = httpResponse?.headers;
        }
        if (httpResponse?.statusCode) {
            res.statusCode = httpResponse?.statusCode;
        }
        if (httpResponse?.request) {
            res.request = httpResponse?.request;
        }
        res.send(httpResponse?.body);
    });
});

// app.use(express.static(path.join(__dirname, ".")));
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, "build", "index.html"));
// });

function log(text) {
    if (loggingEnabled) {
        console.log(text);
    }
}

function warn(text) {
    if (loggingEnabled) {
        console.warn(text);
    }
}

function logLatLong(latIn, longIn, altIn, idIn) {
    let lat, long, alt;
    try {
        if (typeof altIn == 'number' && !isNaN(altIn)) {
            alt = altIn;
        } else {
            alt = parseFloat(altIn);
        }
        if (typeof latIn == 'number' && !isNaN(latIn)) {
            lat = latIn;
        } else {
            lat = parseFloat(latIn);
        }
        if (typeof longIn == 'number' && !isNaN(longIn)) {
            long = longIn;
        } else {
            long = parseFloat(longIn);
        }
    } catch (e) {
        warn(`Unable to parse lat long for logging ${latIn} ${longIn} ${altIn}`);
        return;
    }
    if (isNaN(lat)) {
        warn(`Lat is not a number for logging ${lat}`);
        return;
    }
    if (isNaN(long)) {
        warn(`Long is not a number for logging ${long}`);
        return;
    }
    if (isNaN(alt)) {
        warn(`Alt is not a number for logging ${alt}`);
        return;
    }
    if (idIn === undefined) {
        warn(`ID is undefined for logging ${idIn}`);
        return;
    }
    const point = new Point("latlong")
        .tag("unit", idIn || 'None')
        .timestamp(new Date())
        .floatField("lat", lat)
        .floatField("long", long)
        .floatField("alt", alt);
    influxDBClient.write(point, influxDBDatabase).then(() => {
        log(`Wrote ${lat}, ${long}, ${alt} to InfluxDB`);
    }).catch((e) => {
        log.warn(`Unable to write lat long ${lat}, ${long}, ${alt} to InfluxDB`, e);
    });
}

io.on('connection', socket => {
    log("client connected to socket server " + socket.id);
    socket.on('log-lat-long', (lat_in, long_in, alt_in, id_in) => {
        log(`Logging lat long ${lat_in} ${long_in} ${alt_in}`);
        logLatLong(lat_in, long_in, alt_in, id_in);
    });
    socket.on('log-lat-long-json', (data) => {
        log(`Logging lat long json ${data}`);
        logLatLong(data["lat"], data["long"], data["alt"], data["id"]);
    });
    socket.on('start', (lat, lng, alt, id) => {
        log(`Received start message, lat: ${lat}, lng: ${lng}, alt: ${alt}, id: ${id}`);
        io.emit('start', lat, lng, alt, id);
    });
    socket.on('stop', (id) => {
        log(`Received stop message id: ${id}`);
        io.emit('stop', id);
    });
    socket.on('biometrics-json', (receivedDataIn) => {
        let receivedData = receivedDataIn;
        if (typeof receivedData === 'string' || receivedData instanceof String) {
            try {
                receivedData = JSON.parse(receivedData);
            } catch (e) {
                log("Unable to convert biometric data to JSON object: " + receivedData);
                return;
            }
        }
        log(`Received biometrics ${JSON.stringify(receivedData)}`);
        io.emit('biometrics', receivedData?.id, receivedData?.unitName, receivedData?.heartRate, receivedData?.bloodO2, receivedData?.bodyTemp);
    });
    socket.on('biometrics', (id, unitName, heartRate, bloodO2, bodyTemp) => {
        log(`Received biometrics ID: ${id} unit name: ${unitName} heart rate: ${heartRate} blood O2: ${bloodO2} body temp: ${bodyTemp}`);
        io.emit('biometrics', id, unitName, heartRate, bloodO2, bodyTemp);
    });
    socket.on('send-competition-data', (payload) => {
        log(`Sending competition data`, payload);
        sendCompetitionData(payload, (error, httpResponse, body) => {
            io.emit('competition-data-result', (httpResponse?.body || 'none').toString());
        });
    });
    socket.on('unit-update', (receivedDataIn) => {
        let receivedData = receivedDataIn;
        if (typeof receivedData === 'string' || receivedData instanceof String) {
            try {
                receivedData = JSON.parse(receivedData);
            } catch (e) {
                log("Unable to convert device data to JSON object: " + receivedDataIn);
                return;
            }
        }
        if (!receivedData) {
            log("Undefined data");
            return;
        }
        if (!receivedData["ID"]) {
            log("Data missing ID");
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
        log("Emitting data from device: " + JSON.stringify(receivedData));
        io.emit('device-data', receivedData);
    });
});

server.listen(port, () => {
    log(`Listening on the port ${port}`);
}).on('error', e => {
    if (influxDBClient) {
        influxDBClient.close().then(() => {
            console.log("Closed InfluxDB client");
        }).catch(e => {
            console.error("Unable to close InfluxDB client", e);
        });
    }
    console.error(e);
}).on('close', () => {
    if (influxDBClient) {
        influxDBClient.close().then(() => {
            console.log("Closed InfluxDB client");
        }).catch(e => {
            console.error("Unable to close InfluxDB client", e);
        });
    }
});
