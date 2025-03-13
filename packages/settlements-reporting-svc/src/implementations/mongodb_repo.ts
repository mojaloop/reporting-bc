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

import { ISettlementsReportingRepo } from "../types/mongodb_repo_interface";
import {
    ISettlementBatch, ISettlementMatrix, ITransferReport
} from "@mojaloop/reporting-bc-types-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { Collection, Document, MongoClient, WithId } from "mongodb";

export class SettlementsReportingRepo implements ISettlementsReportingRepo {

    private _mongoUri: string;
    private _logger: ILogger;
    private _mongoClient: MongoClient;
    protected _collectionTransfers: Collection;
    protected _collectionBatches: Collection;
    protected _collectionMatrices: Collection;

    private _initialized: boolean = false;
    private readonly _databaseName: string = "reporting";
    private readonly _collectionNameTransfers: string = "transfers";
    private readonly _collectionNameBatches: string = "batches";
    private readonly _collectionNameMatrices: string = "matrices";


    constructor(_mongoUri: string, logger: ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._mongoUri = _mongoUri;
    }

    async init(): Promise<void> {
        try {

            this._mongoClient = await MongoClient.connect(this._mongoUri);
        } catch (err: any) {
            this._logger.error(err);
            this._logger.isWarnEnabled() &&
                this._logger.warn(
                    `SettlementsReportingRepo - init failed with error: ${err?.message?.toString()}`
                );
            throw err;
        }
        if (this._mongoClient === null)
            throw new Error("Couldn't instantiate mongo client");

        const db = this._mongoClient.db(this._databaseName);

        const collections = await db.listCollections().toArray();

        // Check if the Transfers collection already exists or create.
        if (
            collections.find((col) => col.name === this._collectionNameTransfers)
        ) {
            this._collectionTransfers = db.collection(this._collectionNameTransfers);
        } else {
            this._collectionTransfers = await db.createCollection(this._collectionNameTransfers);
            await this._collectionTransfers.createIndex({ "transferId": 1 }, { unique: true });
        }

        // Check if the Batches collection already exists or create.
        if (collections.find((col) => col.name === this._collectionNameBatches)) {
            this._collectionBatches = db.collection(this._collectionNameBatches);
        } else {
            this._collectionBatches = await db.createCollection(this._collectionNameBatches);
            await this._collectionBatches.createIndex({ id: 1 }, { unique: true });
        }

        // Check if the Matrices collection already exists or create.
        if (collections.find((col) => col.name === this._collectionNameMatrices)) {
            this._collectionMatrices = db.collection(this._collectionNameMatrices);
        } else {
            this._collectionMatrices = await db.createCollection(this._collectionNameMatrices);
            await this._collectionMatrices.createIndex({ id: 1 }, { unique: true });
        }

        this._initialized = true;
        this._logger.info("SettlementsReportingRepo - initialized");
    }

    async storeMatrix(matrix: ISettlementMatrix): Promise<boolean> {
        const result = await this._collectionMatrices.updateOne({ id: matrix.id }, { $set: matrix }, { upsert: true });
        return result.acknowledged;
    }

    async storeBatch(batch: ISettlementBatch): Promise<boolean> {
        const result = await this._collectionBatches.updateOne({ id: batch.id }, { $set: batch }, { upsert: true });
        return result.acknowledged;
    }

    async getTransferById(transferId:string):Promise<ITransferReport|null>{
		const transfer = await this._collectionTransfers.findOne({transferId: transferId }).catch((e: unknown) => {
			this._logger.error(`Unable to get transfer by id: ${(e as Error).message}`);
			throw new Error(`Transfer not found with ID: ${transferId}`);
		});

		if(!transfer){
			return null;
		}
		return this.mapToTransfer(transfer);
	}

    async storeTransfer(transfer: ITransferReport): Promise<boolean> {
        const result = await this._collectionTransfers.updateOne({ transferId: transfer.transferId }, { $set: transfer }, { upsert: true });
        return result.acknowledged;
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

    async destroy(): Promise<void> {
        if (this._initialized) await this._mongoClient.close();
    }
}
