# drone-position-visualizer-server

## About

Server to transmit data for drone position visualization

## Requirements

- [NodeJS](https://nodejs.org/en/download/)
- [yarn](https://classic.yarnpkg.com/lang/en/docs/install/)

## How to Run (Development)

```shell
git clone drone-position-visualizer-server
cd drone-position-visualizer-server
yarn
yarn dev
```

## How to Run (Production)

```shell
git clone drone-position-visualizer-server
cd drone-position-visualizer-server
yarn
yarn start
```

## Environment Variables

- ``LOGGING_ENABLED``
  - When set to ``TRUE`` logging is enabled
  - By default logging is disabled

## Expected Device Data Format

- Send a socket.io message to ``unit-update`` with the following content

```json
{
  "Position": {
    "x": 35.6590945,
    "y": 139.6999859,
    "z": 150.0
  },
  "Orientation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "w": 0.0
  },
  "Confidence": "0x2",
  "ID": 1
}
```

- Send a socket.io message to ``biometrics-json`` with the following content

```json
{
  "id": 1,
  "unitName": "B. Krakowsky",
  "heartRate": 100,
  "bloodO2": 95,
  "bodyTemp": 99
}
```
