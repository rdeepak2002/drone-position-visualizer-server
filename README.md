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

- Send a socket.io message to ``device-1`` with the following content

```json
{
  "Position": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0
  },
  "Orientation": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "w": 0.0
  },
  "Confidence": "0x2"
}
```
