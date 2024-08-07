# Reporting BC - Quote Reporting Service

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
npm run modules/quotes-reporting-svc start
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
| AUTH_N_TOKEN_ISSUER_NAME    | Authentication service token issuer name           |   mojaloop.vnext.dev.default_issuer    |
| AUTH_N_TOKEN_AUDIENCE        | Authentication service token audience    |    mojaloop.vnext.dev.default_audience   |
| AUTH_N_SVC_JWKS_URL  | Authentication service base URL    | http://authentication-svc:3201         |
| AUTH_Z_SVC_BASEURL   | Authorization service base URL    | http://authorization-svc:3202           |
| KAFKA_URL       | Kafka broker URL     | localhost:9092          |
| MONGO_URL            | MongoDB connection URL             | mongodb://root:mongoDbPas42@localhost:27017/ |
| KAFKA_LOGS_TOPIC      | Kafka topic for logs          | logs    |
| AUDIT_KEY_FILE_PATH  | File path for audit key           | /app/data/audit_private_key.pem         |
| SVC_CLIENT_ID        | Service client ID                 | reporting-bc-quotes-reporting-svc          |
| SVC_CLIENT_SECRET    | Service client secret             | superServiceSecret     |
| SVC_DEFAULT_HTTP_PORT                 | Default HTTP port for the service                  | 5003  |
| SERVICE_START_TIMEOUT_MS               | Timeout for service startup in milliseconds        | 60_000                 |
| PARTICIPANTS_SVC_URL | Participant Service URL | "http://localhost:3010" | 
