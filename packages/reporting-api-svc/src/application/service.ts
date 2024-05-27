/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";


import express, {Express} from "express";
import {Server} from "net";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import process from "process";
import util from "util";
import { MongoReportingRepo } from "../implementations/mongodb_repo";
import { IReportingRepo } from "../types";
import { IAuthorizationClient } from "@mojaloop/security-bc-public-types-lib";
import {
    AuditClient,
    KafkaAuditClientDispatcher,
    LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {IAuditClient} from "@mojaloop/auditing-bc-public-types-lib";
import {AuthenticatedHttpRequester, AuthorizationClient, TokenHelper} from "@mojaloop/security-bc-client-lib";
import { ExpressRoutes } from "./routes/routes";
import { ReportingPrivilegesDefinition } from "./privileges";
import { ReportingAggregate } from "../domain/aggregate";
import { existsSync } from "fs";
import {MLKafkaJsonConsumer, MLKafkaJsonConsumerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { DefaultConfigProvider, IConfigProvider } from "@mojaloop/platform-configuration-bc-client-lib";
import { GetReportingConfigSet } from "./configset";
import { IConfigurationClient } from "@mojaloop/platform-configuration-bc-public-types-lib";


// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../../package.json");

// constants
const BC_NAME = "reporting-bc";
const APP_NAME = "reporting-api-svc";
const APP_VERSION = packageJSON.version;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL: LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const MONGO_URL = process.env["MONGO_URL"] || "mongodb://root:mongoDbPas42@localhost:27017/";
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";
const KAFKA_LOGS_TOPIC = process.env["KAFKA_LOGS_TOPIC"] || "logs";
const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";

const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";

const AUTH_N_SVC_BASEURL = process.env["AUTH_N_SVC_BASEURL"] || "http://localhost:3201";
const AUTH_N_SVC_TOKEN_URL = AUTH_N_SVC_BASEURL + "/token"; // TODO this should not be known here, libs that use the base should add the suffix
const AUTH_N_TOKEN_ISSUER_NAME = process.env["AUTH_N_TOKEN_ISSUER_NAME"] || "mojaloop.vnext.dev.default_issuer";
const AUTH_N_TOKEN_AUDIENCE = process.env["AUTH_N_TOKEN_AUDIENCE"] || "mojaloop.vnext.dev.default_audience";

const AUTH_N_SVC_JWKS_URL = process.env["AUTH_N_SVC_JWKS_URL"] || `${AUTH_N_SVC_BASEURL}/.well-known/jwks.json`;

const AUTH_Z_SVC_BASEURL = process.env["AUTH_Z_SVC_BASEURL"] || "http://localhost:3202";

// To be used with AuthenticatedHttpRequester for example
const SVC_CLIENT_ID = process.env["SVC_CLIENT_ID"] || "reporting-bc-reporting-api-svc";
const SVC_CLIENT_SECRET = process.env["SVC_CLIENT_SECRET"] || "superServiceSecret";

const SVC_DEFAULT_HTTP_PORT = 5000;

const SERVICE_START_TIMEOUT_MS = 60_000;

const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};
const kafkaConsumerOptions: MLKafkaJsonConsumerOptions = {
    kafkaBrokerList: KAFKA_URL,
    kafkaGroupId: `${BC_NAME}_${APP_NAME}_authz_client`
};

let globalLogger: ILogger;


export class Service {
    static logger: ILogger;
    static app: Express;
    static expressServer: Server;
    static startupTimer: NodeJS.Timeout;
    static reportingRepo: IReportingRepo;
    static tokenHelper: TokenHelper;
    static auditClient: IAuditClient;
    static authorizationClient: IAuthorizationClient;
    static aggregate: ReportingAggregate;
    static configClient: IConfigurationClient;

    static async start(
        logger?: ILogger,
        auditClient?: IAuditClient,
        authorizationClient?: IAuthorizationClient,
        reportingRepo?: IReportingRepo,
        configProvider?: IConfigProvider,
    ): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
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

        // start config client - this is not mockable (can use STANDALONE MODE if desired)
        if (!configProvider) {
			// use default url from PLATFORM_CONFIG_CENTRAL_URL env var
			const authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
			authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

			const messageConsumer = new MLKafkaJsonConsumer({
				kafkaBrokerList: KAFKA_URL,
				kafkaGroupId: `${APP_NAME}_${Date.now()}` // unique consumer group - use instance id when possible
			}, logger.createChild("configClient.consumer"));
			configProvider = new DefaultConfigProvider(logger, authRequester, messageConsumer);
		}
        this.configClient = GetReportingConfigSet(configProvider, BC_NAME, APP_NAME, APP_VERSION);
        await this.configClient.init();
        await this.configClient.bootstrap(true);
        await this.configClient.fetch();

        // start auditClient
        if (!auditClient) {
            if (!existsSync(AUDIT_KEY_FILE_PATH)) {
                if (PRODUCTION_MODE) process.exit(9);
                // create e tmp file
                LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
            }
            const auditLogger = logger.createChild("AuditLogger");
            auditLogger.setLogLevel(LogLevel.INFO);
            const cryptoProvider = new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
            const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, auditLogger);
            // NOTE: to pass the same kafka logger to the audit client, make sure the logger is started/initialised already
            auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
            await auditClient.init();
        }
        this.auditClient = auditClient;

        // authorization client
        if (!authorizationClient) {
            // create the instance of IAuthenticatedHttpRequester
            const authRequester = new AuthenticatedHttpRequester(logger, AUTH_N_SVC_TOKEN_URL);
            authRequester.setAppCredentials(SVC_CLIENT_ID, SVC_CLIENT_SECRET);

            const consumerHandlerLogger = logger.createChild("authorizationClientConsumer");
            const messageConsumer = new MLKafkaJsonConsumer(kafkaConsumerOptions, consumerHandlerLogger);

            // setup privileges - bootstrap app privs and get priv/role associations
            authorizationClient = new AuthorizationClient(
                BC_NAME, APP_NAME, APP_VERSION,
                AUTH_Z_SVC_BASEURL, logger.createChild("AuthorizationClient"),
                authRequester,
                messageConsumer
            );
            authorizationClient.addPrivilegesArray(ReportingPrivilegesDefinition);
            await (authorizationClient as AuthorizationClient).bootstrap(true);
            await (authorizationClient as AuthorizationClient).fetch();
            // init message consumer to automatically update on role changed events
            await (authorizationClient as AuthorizationClient).init();
        }
        this.authorizationClient = authorizationClient;

        // token helper
        this.tokenHelper = new TokenHelper(AUTH_N_SVC_JWKS_URL, logger, AUTH_N_TOKEN_ISSUER_NAME, AUTH_N_TOKEN_AUDIENCE);
        await this.tokenHelper.init();

        // Create mongo db repo instance
        if (!reportingRepo) {
			const DB_NAME_REPORTING = process.env.REPORTING_DB_NAME ?? "reporting";

			reportingRepo = new MongoReportingRepo(
				logger,
				MONGO_URL,
				DB_NAME_REPORTING
			);
		}
		this.reportingRepo = reportingRepo;

        // Initialize the repo
        await this.reportingRepo.init();
		this.logger.info("Reporting API Repository Initialized");

        this.aggregate = new ReportingAggregate(this.logger, this.auditClient, this.authorizationClient, this.reportingRepo);

        await this.setupExpress();

        // remove startup timeout
        clearTimeout(this.startupTimer);
    }

    static setupExpress(): Promise<void> {
        return new Promise<void>(resolve => {
            this.app = express();
            this.app.use(express.json()); // for parsing application/json
            this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

            // Add health and metrics http routes - before others (to avoid authZ middleware)
            this.app.get("/health", (req: express.Request, res: express.Response) => {
                return res.send({ status: "OK" });
            });
            // this.app.get("/metrics", async (req: express.Request, res: express.Response) => {
            //     const strMetrics = await (this.metrics as PrometheusMetrics).getMetricsForPrometheusScrapper();
            //     return res.send(strMetrics);
            // });

            // hook actual app routes
            const routes = new ExpressRoutes(this.logger, this.tokenHelper, this.authorizationClient, this.reportingRepo, this.aggregate);
            this.app.use("/", routes.mainRouter);

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
                this.logger.info(`Reporting API service v: ${APP_VERSION} started`);
                resolve();
            });
        });
    }

    static async stop() {
        if (this.expressServer){
            const closeExpress = util.promisify(this.expressServer.close);
            await closeExpress();
        }

        // Stop everything else here
        if (this.reportingRepo) await this.reportingRepo.destroy();

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
