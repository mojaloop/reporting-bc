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

 * ThitsaWorks
 - Myo Min Htet <myo.htet@thitsaworks.com>
 - Sithu Kyaw <sithu.kyaw@thitsaworks.com>

 --------------
 ******/

"use strict";

import { IMongoDbQuotesReportingRepo } from "../interfaces/infrastructure";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { Collection, Document, MongoClient, WithId } from "mongodb";
import { IQuoteReport } from "@mojaloop/reporting-bc-types-lib";
import { randomUUID } from "crypto";
import { QuoteAlreadyExistsError, UnableToAddQuoteError } from "../types/errors";

export class MongoDbQuotesReportingRepo implements IMongoDbQuotesReportingRepo {

    private _mongoUri: string;
    private _logger: ILogger;
    private _mongoClient: MongoClient;
    protected _collectionQuotes: Collection;

    private _initialized: boolean = false;
    private readonly _databaseName: string = "reporting";
    private readonly _collectionNameQuote: string = "quote";


    constructor(_mongoUri: string, logger: ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._mongoUri = _mongoUri;
    }

    async init(): Promise<void> {
        try {
            // this._mongoClient = await MongoClient.connect(this._mongoUri, { useNewUrlParser: true });
            this._mongoClient = await MongoClient.connect(this._mongoUri);
        } catch (err: any) {
            this._logger.error(err);
            this._logger.isWarnEnabled() &&
                this._logger.warn(
                    `MongoDbQuoteRepo - init failed with error: ${err?.message?.toString()}`
                );
            throw err;
        }
        if (this._mongoClient === null)
            throw new Error("Couldn't instantiate mongo client");

        const db = this._mongoClient.db(this._databaseName);

        const collections = await db.listCollections().toArray();

        // Check if the Quote collection already exists or create.
        if (
            collections.find((col) => col.name === this._collectionNameQuote)
        ) {
            this._collectionQuotes = db.collection(
                this._collectionNameQuote
            );
        } else {
            this._collectionQuotes = await db.createCollection(
                this._collectionNameQuote
            );
            await this._collectionQuotes.createIndex(
                { "quoteId": 1 },
                { unique: true }
            );
        }

        this._initialized = true;
        this._logger.info("MongoDBQuotesRepo - initialized");
    }

    async addQuote(quote: IQuoteReport): Promise<string> {

        if (!quote.quoteId) {
            throw new Error("Missing quoteId.");
        } else {
            const existingQuote = await this.getQuoteById(quote.quoteId);
            if (existingQuote) {
                throw new QuoteAlreadyExistsError("Quote already exist!");
            }
        }

        await this._collectionQuotes.insertOne(quote).catch((e: unknown) => {
            this._logger.error(`Unable to insert quote: ${(e as Error).message}`);
            throw new UnableToAddQuoteError(`${(e as Error).message}`);
        });
        
        return quote.quoteId;
    }

    async addQuotes(quotes: IQuoteReport[]): Promise<void> {
        const quotesToAdd = quotes.map((quote) => {
            return { ...quote, quoteId: quote.quoteId || randomUUID() };
        });

        // Check if any of the quotes already exists
        for await (const quote of quotesToAdd) {
            await this.checkIfQuoteExists(quote);
        }

        await this._collectionQuotes.insertMany(quotesToAdd).catch((e: unknown) => {
            this._logger.error(
                `Unable to insert many quotes: ${(e as Error).message}`
            );
            throw new Error(
                "Unable to insert many quotes"
            );
        });
    }

    async getQuoteById(quoteId: string): Promise<IQuoteReport | null> {
        const quote = await this._collectionQuotes
            .findOne({ quoteId: quoteId })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to get quote by id: ${(e as Error).message}`
                );
                throw new Error("Unable to get quote by id");
            });

        if (!quote) {
            return null;
        }
        return this.mapToQuote(quote);
    }

    async updateQuote(quote: IQuoteReport): Promise<void> {
        const existingQuote = await this.getQuoteById(quote.quoteId);

        if (!existingQuote || !existingQuote.quoteId) {
            throw new Error("Quote not found");
        }

        await this._collectionQuotes
            .updateOne({ quoteId: quote.quoteId }, { $set: quote })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to insert quote: ${(e as Error).message}`
                );
                throw new Error("Unable to update quote");
            });
    }

    async updateQuotes(quotes: IQuoteReport[]): Promise<void> {
        const bulkOps = quotes.map((quote) => ({
            updateOne: {
                filter: { quoteId: quote.quoteId },
                update: { $set: quote },
            },
        }));

        // Perform the bulk update operation
        await this._collectionQuotes.bulkWrite(bulkOps, { ordered: false, }).catch((e: unknown) => {
            this._logger.error(
                `Unable to update many quotes: ${(e as Error).message}`
            );
            throw new Error("Unable to update many quotes");
        });
    }

    async removeQuote(quoteId: string): Promise<void> {
        const deleteResult = await this._collectionQuotes
            .deleteOne({ quoteId })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to delete quote: ${(e as Error).message}`
                );
                throw new Error("Unable to delete quote");
            });

        if (deleteResult.deletedCount == 1) {
            return;
        } else {
            throw new Error("Quote not found");
        }
    }


    private async checkIfQuoteExists(quote: IQuoteReport) {
        const quoteAlreadyPresent: WithId<Document> | null = await this._collectionQuotes
            .findOne({
                quoteId: quote.quoteId,
            })
            .catch((e: unknown) => {
                this._logger.error(
                    `Unable to add quote: ${(e as Error).message}`
                );
                throw new Error("Unable to add quote");
            });

        if (quoteAlreadyPresent) {
            throw new Error("Quote already exists");
        }
    }

    private mapToQuote(quote: WithId<Document>): IQuoteReport {
        const quoteMapped: IQuoteReport = {
            quoteId: quote.quoteId ?? null,
            bulkQuoteId: quote.bulkQuoteId ?? null,
            transactionId: quote.transactionId ?? null,
            payee: quote.payee ?? null,
            payer: quote.payer ?? null,
            amountType: quote.amountType ?? null,
            amount: quote.amount ?? null,
            transactionType: quote.transactionType ?? null,
            feesPayer: quote.feesPayer ?? null,
            transactionRequestId: quote.transactionRequestId ?? null,
            geoCode: quote.geoCode ?? null,
            note: quote.note ?? null,
            expiration: quote.expiration ?? null,
            extensionList: quote.extensionList ?? null,
            status: quote.status ?? null,
            totalTransferAmount: quote.totalTransferAmount ?? null,
            ilpPacket: quote.ilpPacket ?? null,
            condition: quote.condition ?? null,
            destinationFspId: quote.destinationFspId ?? null,
            payeeFspCommission: quote.payeeFspCommission ?? null,
            payeeFspFee: quote.payeeFspFee ?? null,
            payeeReceiveAmount: quote.payeeReceiveAmount ?? null,
            requesterFspId: quote.requesterFspId ?? null,
            errorInformation: quote.errorInformation ?? null,
            transferAmount: quote.transferAmount ?? null,
        };
        return quoteMapped;
    }

    async destroy(): Promise<void> {
        if (this._initialized) await this._mongoClient.close();
    }
}
