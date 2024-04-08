# Onboarding

>*Note:* Before completing this guide, make sure you have completed the _general_ onboarding guide in the [base mojaloop repository](https://github.com/mojaloop/mojaloop/blob/main/onboarding.md#mojaloop-onboarding).

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Service Overview](#2-service-overview)
3. [Installing and Building](#3-installing-and-building)
4. [Running Locally](#4-running-locally-dependencies-inside-of-docker)
5. [Testing](#6-testing)
6. [Common Errors/FAQs](#7-common-errorsfaqs)

##  1. Prerequisites

If you have followed the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/main/onboarding.md#mojaloop-onboarding), you should already have the following cli tools installed:

* `brew` (macOS), [todo: windows package manager]
* `curl`, `wget`
* `docker` + `docker-compose`
* `node`, `npm` and (optionally) `nvm`

## 2. Service Overview 
The Reporting BC consists of the following packages;

`participants-reporting-svc`
Participants Reporting Service.
[README](packages/participants-reporting-svc/README.md)

`quotes-reporting-svc`
Quotes Reporting Service.
[README](packages/quotes-reporting-svc/README.md)

`reporting-api-svc`
Reporting API Service.
[README](packages/reporting-api-svc/README.md)

`reporting-types-lib`
Reporting Types Library.
[README](./packages/reporting-types-lib/README.md)

`settlements-reporting-svc`
Settlements Reporting Service.
[README](./packages/settlements-reporting-svc/README.md)

`transfers-reporting-svc`
Transfers Reporting Service.
[README](./packages/transfers-reporting-svc/README.md)

## 3. <a name='InstallingandBuilding'></a>Installing and Building

Firstly, clone your fork of the `reporting-bc` onto your local machine:
```bash
git clone https://github.com/<your_username>/reporting-bc.git
```

Then `cd` into the directory and install the node modules:
```bash
cd reporting-bc
```

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Dependencies

```bash
npm install
```

#### Build

```bash
npm run build
``` 

## 4. Running Locally (dependencies inside of docker)

In this method, we will run all of the core dependencies inside of docker containers, while running the `reporting-bc` server on your local machine.

> Alternatively, you can run the `reporting-bc` inside of `docker-compose` with the rest of the dependencies to make the setup a little easier: [Running Inside Docker](#5-running-inside-docker).

### 4.1 Run all back-end dependencies as part of the Docker Compose

Use [platform-shared-tools docker-compose files](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/): 
Follow instructions in the `README.md` files to run the supporting services. Make sure you have the following services up and running:

Use [platform-shared-tools docker-compose files](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/): 
Follow instructions in the `README.md` files to run the supporting services. Make sure you have the following services up and running:

- infra services : [docker-compose-infra](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-infra)
	- mongo
	- kafka
	- zoo

- cross-cutting services : [docker-compose-cross-cutting](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-cross-cutting)
	- authentication-svc
	- authorization-svc
	- identity-svc
	- platform-configuration-svc

- apps services : [docker-compose-apps](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-apps)
    - account-lookup-svc
    - accounts_and_balances_builtin-ledger-grpc-svc
    - accounts_and_balances_coa-grpc-svc
	- participants-svc
    - quoting-svc
    - scheduling-command-handler-svc
    - settlements-command-handler-svc
    - settlements-event-handler-svc
    - transfers-command-handler
    - transfers-event-handler
    - ttk-1
    - ttk-2
    - ttk-ui-1
    - ttk-ui-2
    - fspiop-api-svc

This will do the following:
* `docker pull` down any dependencies defined in each `docker-compose.yml` file, and the services.
* run all of the containers together
* ensure that all dependencies have started for each services.


### 4.2 Set Up Environment Variables

```bash
# set the MONGO_URL* environment variable (required):
export MONGO_URL=mongodb://root:mongoDbPas42@localhost:27017/";
```

```bash
# set the AUDIT_KEY_FILE_PATH 
export AUDIT_KEY_FILE_PATH=./dist/auditing_cert
```
See the README.md file on each services for more Environment Variable Configuration options.



## 5. Testing
We use `npm` scripts as a common entrypoint for running the tests. Tests include unit, functional, and integration.

```bash
# unit tests:
npm run test:unit

# check test coverage
npm run test:coverage

# integration tests
npm run test:integration
```

### 5.1 Testing the `reporting-bc` API with Postman

[Here](https://github.com/mojaloop/platform-shared-tools/tree/main/packages/postman) you can find a complete Postman collection, in a json file, ready to be imported to Postman.


## 6. Common Errors/FAQs

To run those services locally, you need to pass 2 env vars like this (executed in packages/authentication-svc):

```bash
export PRIVATE_CERT_PEM_FILE_PATH=test_keys/private.pem
export IAM_STORAGE_FILE_PATH=dist/authN_TempStorageFile
```
### Unable to load dlfcn_load
```bash
error:25066067:DSO support routines:dlfcn_load:could not load the shared library
```
Fix: https://github.com/mojaloop/security-bc.git  `export OPENSSL_CONF=/dev/null`