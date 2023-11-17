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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { Collection, MongoClient } from "mongodb";
import {
    UnableToCloseDatabaseConnectionError,
} from "./errors";
import { IReportingRepo } from "../types";


export class MongoReportingRepo implements IReportingRepo {
    private readonly _logger: ILogger;
    private readonly _connectionString: string;
    private readonly _dbName: string;
    private readonly _colTransfers = "transfers";
    private readonly _colMatrices = "matrices";
    private mongoClient: MongoClient;
    private transfers: Collection;
    private matrices: Collection;

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
            this.matrices = this.mongoClient.db(this._dbName).collection(this._colMatrices);

        } catch (e: any) {
            this._logger.error(`Unable to connect to the database: ${(e as Error).message}`);
            throw new Error(e);
        }
    }

    async getSettlementInitiationByMatrixId(matrixId: string): Promise<any> {
        try {
            this._logger.info(`Get settlementInitiationbyMatrixId: ${matrixId}`);
            const result =
                this.matrices.aggregate([
                    {
                        $match: {
                            id: matrixId, // Filter by matrices ID
                        },
                    },
                    {
                        $unwind: "$balancesByParticipant",
                    },
                    {
                        $lookup: {
                            from: "participant",
                            localField: "balancesByParticipant.participantId",
                            foreignField: "id",
                            as: "participantInfo",
                        },
                    },
                    {
                        $unwind: "$participantInfo",
                    },
                    {
                        $project: {
                            _id: 0,
                            matrixId: "$id",
                            participantId: "$participantInfo.id",
                            externalBankAccountId: {
                                $arrayElemAt: [
                                    {
                                        $map: {
                                            input: {
                                                $filter: {
                                                    input: "$participantInfo.participantAccounts",
                                                    as: "account",
                                                    cond: { $eq: ["$$account.type", "SETTLEMENT"] }
                                                }
                                            },
                                            as: "account",
                                            in: "$$account.externalBankAccountId"
                                        }
                                    },
                                    0
                                ]
                            },
                            externalBankAccountName: {
                                $arrayElemAt: [
                                    {
                                        $map: {
                                            input: {
                                                $filter: {
                                                    input: "$participantInfo.participantAccounts",
                                                    as: "account",
                                                    cond: { $eq: ["$$account.type", "SETTLEMENT"] }
                                                }
                                            },
                                            as: "account",
                                            in: "$$account.externalBankAccountName"
                                        }
                                    },
                                    0
                                ]
                            },
                            participantCurrencyCode: "$balancesByParticipant.currencyCode",
                            participantDebitBalance: "$balancesByParticipant.debitBalance",
                            participantCreditBalance: "$balancesByParticipant.creditBalance",
                            settlementCreatedDate: "$createdAt",
                        },
                    }
                ]).toArray();

            return result;
        } catch (e: unknown) {
            this._logger.error(e, `getSettlementInitiationByMatrixId: error getting data for matrixId: ${matrixId} - ${e}`);
            return Promise.reject(e);
        }
    }

    async getDFSPSettlementDetail(participantId: string, matrixId: string): Promise<any> {
        try {
            this._logger.info(`Get DFSPSettlementDetail by participantId: ${participantId} and matrixId: ${matrixId}`);

            const result =
                this.transfers.aggregate([
                    {
                        $match: {
                            matrixId: matrixId
                        }
                    },
                    {
                        $lookup: {
                            from: "matrices",
                            localField: "matrixId",
                            foreignField: "id",
                            as: "matrices"
                        }
                    },
                    {
                        $unwind: "$matrices"
                    },
                    {
                        $lookup: {
                            from: "participant",
                            localField: "payerFspId",
                            foreignField: "id",
                            as: "payerParticipant"
                        }
                    },
                    {
                        $unwind: "$payerParticipant"
                    },
                    {
                        $lookup: {
                            from: "participant",
                            localField: "payeeFspId",
                            foreignField: "id",
                            as: "payeeParticipant"
                        }
                    },
                    {
                        $unwind: "$payeeParticipant"
                    },
                    {
                        $lookup: {
                            from: "quote",
                            localField: "transferId",
                            foreignField: "transactionId",
                            as: "quote"
                        }
                    },
                    {
                        $unwind: "$quote"
                    },
                    {
                        $match: {
                            $or: [
                                { "payerFspId": participantId },
                                { "payeeFspId": participantId }
                            ]
                        }
                    },
                    {
                        $project: {
                            "_id": 0,
                            "matrixId": "$matrixId",
                            "settlementDate": "$matrices.createdAt",
                            "payerFspId": "$payerFspId",
                            "payerParticipantName": "$payerParticipant.name",
                            "payeeFspId": "$payeeFspId",
                            "payeeParticipantName": "$payeeParticipant.name",
                            "transferId": "$transferId",
                            "transactionType": "$quote.transactionType.scenario",
                            "transactionDate": "$completedTimestamp",
                            "payerIdType": "$quote.payer.partyIdInfo.partyIdType",
                            "payerIdentifier": "$quote.payer.partyIdInfo.partyIdentifier",
                            "payeeIdType": "$quote.payee.partyIdInfo.partyIdType",
                            "payeeIdentifier": "$quote.payee.partyIdInfo.partyIdentifier",
                            "Amount": "$amount",
                            "Currency": "$currencyCode"
                        }
                    }
                ]).toArray();

            return result;
        } catch (e: unknown) {
            this._logger.error(e, `getDFSPSettlementDetail error getting data for participantId: ${participantId} and matrixId: ${matrixId} - ${e}`);
            return Promise.reject(e);
        }
    }

    async getDFSPSettlement(participantId: string, matrixId: string): Promise<any> {
        try {
            this._logger.info(`Get DFSPSettlement by participantId: ${participantId} and matrixId: ${matrixId}`);

            const result =
                this.transfers.aggregate([
                    {
                        $match: {
                            matrixId: matrixId
                        }
                    },
                    {
                        $lookup: {
                            from: "matrices",
                            localField: "matrixId",
                            foreignField: "id",
                            as: "matrices"
                        }
                    },
                    {
                        $unwind: "$matrices"
                    },
                    {
                        $match: {
                            $or: [
                                { "payerFspId": participantId },
                                { "payeeFspId": participantId }
                            ]
                        }
                    },
                    {
                        $project: {
                            "_id": 0,
                            "matrixId": "$matrixId",
                            "settlementDate": "$matrices.createdAt",
                            "paramParticipantId": participantId,
                            "relateParticipantId": {
                                                    $cond: [
                                                            { $eq: ["$payerFspId", participantId] },
                                                            "$payeeFspId",
                                                            "$payerFspId"
                                                        ]
                                                },
                            "direction": {
                                            $cond: [
                                                    { $eq: ["$payerFspId", participantId] },
                                                    "sent",
                                                    "recieved"
                                                ]
                                        },
                            "amount": { $toDouble: "$amount" },
                            "currency": "$currencyCode"
                        }
                    },
                    {
                        $group: {
                             _id: {
                                paramParticipantId: "$paramParticipantId",
                                relateParticipantId: "$relateParticipantId",
                                currency: "$currency",
                                matrixId: "$matrixId",
                                settlementDate: "$settlementDate"
                            },
                            totalAmountSent: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$direction", "sent"] },
                                        "$amount",
                                        0
                                    ]
                                }
                            },
                            totalSentCount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$direction", "sent"] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            totalAmountReceived: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$direction", "recieved"] },
                                        "$amount",
                                        0
                                    ]
                                }
                            },
                            totalReceivedCount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$direction", "recieved"] },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $sort: {
                            "_id.relateParticipantId": 1,
                            "_id.currency": 1
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            matrixId: "$_id.matrixId",
                            settlementDate: "$_id.settlementDate",
                            paramParticipantId: "$_id.paramParticipantId",
                            relateParticipantId: "$_id.relateParticipantId",
                            currency: "$_id.currency",
                            totalAmountSent: 1,
                            totalSentCount: 1,
                            totalAmountReceived: 1,
                            totalReceivedCount: 1
                        }
                    },	
                    {
                        $lookup: {
                          from: "participant",
                          localField: "paramParticipantId",
                          foreignField: "id",
                          as: "paramParticipantInfo"
                        }
                    },
                    {
                        $unwind: "$paramParticipantInfo"
                    },
                    {
                        $lookup: {
                          from: "participant",
                          localField: "relateParticipantId",
                          foreignField: "id",
                          as: "relateParticipantInfo"
                        }
                    },
                    {
                        $unwind: "$relateParticipantInfo"
                    },
                    {
                        $project: {
                            _id: 0,
                            matrixId: "$matrixId",
                            settlementDate: "$settlementDate",
                            paramParticipantId: "$paramParticipantId",
                            paramParticipantName: "$paramParticipantInfo.name",
                            relateParticipantId: "$relateParticipantId",
                            relateParticipantName: "$relateParticipantInfo.name",
                            currency: "$currency",
                            totalAmountSent: 1,
                            totalSentCount: 1,
                            totalAmountReceived: 1,
                            totalReceivedCount: 1
                        }
                    }
                ]).toArray();
                

            return result;
        } catch (e: unknown) {
            this._logger.error(e, `getDFSPSettlement: error getting data for participantId: ${participantId} and matrixId: ${matrixId} - ${e}`);
            return Promise.reject(e);
        }
    }

    async getSettlementMatricesByDfspNameAndFromDateToDate(participantId: string, startDate: number, endDate: number): Promise<any> {
        try {
            this._logger.info("Get getSettlementMatricesByDfspNameAndFromDateToDate");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filter: any = { $and: [] };
            if (participantId) {
                filter.$and.push({ "balancesByParticipant.participantId": { "$regex": participantId, "$options": "i" } });
            }
            if (startDate) {
                filter.$and.push({ updatedAt: { $gte: startDate } });
            }
            if (endDate) {
                filter.$and.push({ updatedAt: { $lte: endDate } });
            }

            const matrices = await this.matrices.find(
                filter,
                { sort: ["updatedAt", "desc"], projection: { _id: 0, id: 1 } }
            ).toArray().catch((e: unknown) => {
                this._logger.error(`Unable to get matrixIds: ${(e as Error).message}`);
                throw new Error(`Unable to get matrixIds: ${(e as Error).message}`);
            });

            return matrices;
        } catch (e: unknown) {
            this._logger.error(e, `getSettlementMatricesByDfspNameAndFromDateToDate for : ${participantId} , ${startDate} and ${endDate} - ${e}`);
            return Promise.reject(e);
        }
    }

    async destroy(): Promise<void> {
        try {
            await this.mongoClient.close();

        } catch (e: unknown) {
            this._logger.error(`Unable to close the database connection: ${(e as Error).message}`);
            throw new UnableToCloseDatabaseConnectionError();
        }
    }
}
