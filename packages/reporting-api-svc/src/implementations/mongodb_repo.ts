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

import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import { Collection, Document, MongoClient, WithId } from 'mongodb';
import { 
    UnableToInitTransfersReportingRepoError,
    UnableToCloseDatabaseConnectionError,
} from "./errors";
import { IReportingRepo } from '../types';


export class MongoReportingRepo implements IReportingRepo {
    private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _dbName: string;
	private readonly _colTransfers = "transfers";
    private mongoClient: MongoClient;
	private transfers: Collection;

    constructor(
        logger: ILogger,
        connectionString: string,
		dbName: string
    ) {
        this._logger = logger.createChild(this.constructor.name);
        this._connectionString = connectionString;
		this._dbName = dbName;
    }

    async init(): Promise<void> {
        try {
            this.mongoClient = new MongoClient(this._connectionString);
			await this.mongoClient.connect();

            // Get the collections
			this.transfers = this.mongoClient.db(this._dbName).collection(this._colTransfers);

        } catch (e: unknown) {
            this._logger.error(`Unable to connect to the database: ${(e as Error).message}`);
			throw new UnableToInitTransfersReportingRepoError();
        }
    }

    async destroy(): Promise<void> {
		try{
			await this.mongoClient.close();

		} catch(e: unknown) {
			this._logger.error(`Unable to close the database connection: ${(e as Error).message}`);
			throw new UnableToCloseDatabaseConnectionError();
		}
	}
}
