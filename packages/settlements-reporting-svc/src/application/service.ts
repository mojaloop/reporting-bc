/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>

* ThitsaWorks
- Myo Min Htet <myo.htet@thitsaworks.com>
*****/

"use strict";


import express, { Express } from "express";
import { Server } from "net";
import { KafkaLogger } from "@mojaloop/logging-bc-client-lib";
import { ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";

import { IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { SettlementReportingEventHandler } from "./event_handler";

import process from "process";
import util from "util";
import {
    MLKafkaJsonConsumer,
    MLKafkaJsonConsumerOptions
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {
    TokenHelper
} from "@mojaloop/security-bc-client-lib";
import { ISettlementsReportingRepo } from "../types/mongodb_repo_interface";
import { SettlementsReportingRepo } from "../implementations/mongodb_repo";
import { ISettlementServiceAdapter } from "../types/settlement_adapter_interface";
import { SettlementsAdapter } from "../implementations/settlement_adapter";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../../package.json");

// constants
const BC_NAME = "reporting-bc";
const APP_NAME = "settlements-reporting-svc";
const APP_VERSION = packageJSON.version;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const SVC_DEFAULT_HTTP_PORT = 5004;

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix


const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";

const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";

const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "reporting-bc-settlements-reporting-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

const SETTLEMENTS_SVC_URL = process.env["SETTLEMENTS_SVC_URL"] || "http://localhost:3600";
const SERVICE_START_TIMEOUT_MS = 60_000;


const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

const kafkaConsumerOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}`
};

const SETTLEMENTS_CLIENT_CACHE_MS = 10_000;
let globalLogger: ILogger;

export class Service {
    static logger: ILogger;
    static app: Express;
    static expressServer: Server;
    static startupTimer: NodeJS.Timeout;
    static messageConsumer: IMessageConsumer;
    static handler: SettlementReportingEventHandler;
    static settlementRepo: ISettlementsReportingRepo;
    static tokenHelper: TokenHelper;
    static settlementAdapter: ISettlementServiceAdapter; 

    static async start(
        logger?: ILogger,
        messageConsumer?: IMessageConsumer,
        settlementRepo?: ISettlementsReportingRepo,
        settlementAdapter?: ISettlementServiceAdapter
    ): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(() => {
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);

        if (!logger) {
            logger = new KafkaLogger(
                BC_NAME,
                APP_NAME,
                APP_VERSION,
                kafkaProducerOptions,
                KAFKA_LOGS_TOPIC,
                LOG_LEVEL
            );
            await (logger as KafkaLogger).init();
        }
        globalLogger = this.logger = logger;

        if (!messageConsumer) {
            const consumerHandlerLogger = logger.createChild("handlerConsumer");
            consumerHandlerLogger.setLogLevel(LogLevel.INFO);
            messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, consumerHandlerLogger);
        }
        this.messageConsumer = messageConsumer;

        if (!settlementRepo) {
            settlementRepo = new SettlementsReportingRepo(MONGO_URL, logger);

            await settlementRepo.init();
            logger.info("Settlements reporting Repo Initialized");
        }
        this.settlementRepo = settlementRepo;

        if (!settlementAdapter) {
            settlementAdapter = new SettlementsAdapter(this.logger, SETTLEMENTS_SVC_URL, AUTH_N_SVC_TOKEN_URL, SVC_CLIENT_ID, SVC_CLIENT_SECRET,SETTLEMENTS_CLIENT_CACHE_MS);
        }
        this.settlementAdapter = settlementAdapter;

        
        
        this.handler = new SettlementReportingEventHandler(this.messageConsumer, this.logger, this.settlementRepo, this.settlementAdapter);
        await this.handler.start();

        await this.setupExpress();

        // remove startup timeout
        clearTimeout(this.startupTimer);
    }

    static setupExpress(): Promise<void> {
        return new Promise<void>(resolve => {
            this.app = express();
            this.app.use(express.json()); // for parsing application/json
            this.app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

            // Add health and metrics http routes - before others (to avoid authZ middleware)
            this.app.get("/health", (req: express.Request, res: express.Response) => {
                return res.send({ status: "OK" });
            });

            this.app.use((req, res) => {
                // catch all
                res.send(404);
            });

            let portNum = SVC_DEFAULT_HTTP_PORT;
            if (process.env["SVC_HTTP_PORT"] && !isNaN(parseInt(process.env["SVC_HTTP_PORT"]))) {
                portNum = parseInt(process.env["SVC_HTTP_PORT"]);
            }

            this.expressServer = this.app.listen(portNum, () => {
                this.logger.info(`🚀 Server ready at port: ${portNum}`);
                this.logger.info(`Settlement Reporting service v: ${APP_VERSION} started`);
                resolve();
            });
        });
    }

    static async stop() {
        if (this.expressServer) {
            const closeExpress = util.promisify(this.expressServer.close);
            await closeExpress();
        }

        // Stop everything else here
        if (this.handler) await this.handler.stop();
        if (this.messageConsumer) await this.messageConsumer.destroy(true);
        if (this.logger && this.logger instanceof KafkaLogger) await this.logger.destroy();
    }
}


/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    let clean_exit = false;
    setTimeout(() => {
        clean_exit || process.exit(99);
    }, 5000);

    // call graceful stop routine
    await Service.stop();

    clean_exit = true;
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals);
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
process.on("exit", async () => {
    globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
    console.error(err);
    console.log("UncaughtException - EXITING...");
    process.exit(999);
});
