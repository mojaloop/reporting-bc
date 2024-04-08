# Reporting BC - Settlements Reporting Service

#Notes

### Install
See notes in root dir of this repository

More information on how to install NVM: https://github.com/nvm-sh/nvm

## Build

```bash
npm run build
```

## Run this service

Anywhere in the repo structure:
```bash
npm run modules/settlements-reporting-svc start
```

## Auto build (watch)

```bash
npm run watch
```

## Unit Tests

```bash
npm run test:unit
```

## Integration Tests

```bash
npm run test:integration
```

## Configuration 

### Environment variables

| Environment Variable | Description    | Example Values         |
|---------------------|-----------------|-----------------------------------------|
| PRODUCTION_MODE      | Flag indicating production mode   | FALSE                  |
| LOG_LEVEL            | Logging level for the application                  | LogLevel.DEBUG        |
| AUTH_N_SVC_BASEURL | Authentication service base URL  |http://localhost:3201|
| KAFKA_URL       | Kafka broker URL     | localhost:9092          |
| MONGO_URL            | MongoDB connection URL             | mongodb://root:mongoDbPas42@localhost:27017/ |
| KAFKA_LOGS_TOPIC      | Kafka topic for logs          | logs    |
| SVC_CLIENT_ID        | Service client ID                 | reporting-bc-settlements-reporting-svc          |
| SVC_CLIENT_SECRET    | Service client secret             | superServiceSecret     |
| SVC_DEFAULT_HTTP_PORT                 | Default HTTP port for the service                  | 5004  |
| SERVICE_START_TIMEOUT_MS               | Timeout for service startup in milliseconds        | 60_000                 |
| SETTLEMENT_SVC_URL | Settlement Service URL | "http://localhost:3600" | 