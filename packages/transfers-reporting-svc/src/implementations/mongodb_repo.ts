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

import {
    IDailyTransferStats, 
    ITransferReport
} from "@mojaloop/reporting-bc-types-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { Collection, Document, MongoClient, WithId } from "mongodb";
import { 
    UnableToInitTransfersReportingRepoError,
    UnableToCloseDatabaseConnectionError,
    UnableToGetTransferError,
    TransferAlreadyExistsError,
    UnableToAddTransferError,
    UnableToUpdateTransferError,
} from "./errors";
import { ITransfersReportingRepo } from "../types/infrastructure";


export class MongoTransfersReportingRepo implements ITransfersReportingRepo {
    private readonly _logger: ILogger;
	private readonly _connectionString: string;
	private readonly _dbName: string;
	private readonly _collectionName = "transfers";
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
			this.transfers = this.mongoClient.db(this._dbName).collection(this._collectionName);

            await this.transfers.createIndex({"transferId": 1}, {unique: true});

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

    async getDailyStats(day: string): Promise<IDailyTransferStats> {
        throw new Error("not implemented");
    }

    async updateDailyStats(stats: IDailyTransferStats): Promise<void> {
        throw new Error("not implemented");
    }

    async getTransferById(transferId: string): Promise<ITransferReport | null> {
        const transfer = await this.transfers.findOne({ transferId: transferId }).catch((e: unknown) => {
			this._logger.error(`Unable to get transfer by id: ${(e as Error).message}`);
			throw new UnableToGetTransferError(`${(e as Error).message}`);
		});

		if (!transfer) {
			return null;
		}

		return this.mapToTransfer(transfer);
    }

    async addTransfer(transfer: ITransferReport): Promise<string> {
		if (!transfer.transferId) {
            throw new Error("Missing transfer ID");
        } else {
            const existingTransfer = await this.getTransferById(transfer.transferId);
            if (existingTransfer) {
                throw new TransferAlreadyExistsError();
            }
        }

        await this.transfers.insertOne(transfer).catch((e: unknown) => {
            this._logger.error(`Unable to insert transfer: ${(e as Error).message}`);
            throw new UnableToAddTransferError(`${(e as Error).message}`);
        });

        return transfer.transferId;
    }

    async updateTransfer(transfer: ITransferReport): Promise<void> {
        const result = await this.transfers.updateOne({transferId: transfer.transferId, }, { $set: transfer }).catch((e: unknown) => {
			this._logger.error(`Unable to update transfer: ${(e as Error).message}`);
			throw new UnableToUpdateTransferError(`${(e as Error).message}`);
		});

        if (result.modifiedCount === 0) {
            throw new UnableToUpdateTransferError();
        }
    }

    private mapToTransfer(transfer: WithId<Document>): ITransferReport {
		const transferMapped: ITransferReport = {
			createdAt: transfer.createdAt ?? null,
			updatedAt: transfer.updatedAt ?? null,
			transferId: transfer.transferId ?? null,
			payeeFspId: transfer.payeeFspId ?? null,
			payerFspId: transfer.payerFspId ?? null,
			amount: transfer.amount ?? null,
			currencyCode: transfer.currencyCode ?? null,
			expirationTimestamp: transfer.expirationTimestamp ?? null,
			transferState: transfer.transferState ?? null,
			completedTimestamp: transfer.completedTimestamp ?? null,
            errorInformation: transfer.errorInformation ?? null,
            extensionList: transfer.extensionList ?? null,
			settlementModel: transfer.settlementModel ?? null,
            preparedAt: transfer.preparedAt ?? null,
            fulfiledAt: transfer.fulfiledAt ?? null,
            batchId: transfer.batchId ?? "",
            batchName: transfer.batchName ?? "",
            journalEntryId: transfer.journalEntryId ?? "",
            matrixId: transfer.matrixId ?? null

		};

		return transferMapped;
	}
}
