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

 --------------
 ******/

"use strict";

import { IMongoDbParticipantReportingRepo } from "../types/mongodb_repo_interface";
import {
    IParticipantReport
} from "@mojaloop/reporting-bc-types-lib";
import { IParticipant } from "@mojaloop/participant-bc-public-types-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { Collection, MongoClient } from "mongodb";

export class MongoDbParticipantReportingRepo implements IMongoDbParticipantReportingRepo {

    private _mongoUri: string;
    private _logger: ILogger;
    private _mongoClient: MongoClient;
    protected _collectionParticipant: Collection;
    protected _collectionApproval: Collection;

    private _initialized: boolean = false;
    private readonly _databaseName: string = "reporting";
    private readonly _collectionNameParticipant: string = "participant";
    private readonly _collectionNameApproval: string = "participantApproval";


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
                    `MongoDbParticipantRepo - init failed with error: ${err?.message?.toString()}`
                );
            throw err;
        }
        if (this._mongoClient === null)
            throw new Error("Couldn't instantiate mongo client");

        const db = this._mongoClient.db(this._databaseName);

        const collections = await db.listCollections().toArray();

        // Check if the Participants collection already exists or create.
        if (
            collections.find((col) => col.name === this._collectionNameParticipant)
        ) {
            this._collectionParticipant = db.collection(
                this._collectionNameParticipant
            );
        } else {
            this._collectionParticipant = await db.createCollection(
                this._collectionNameParticipant
            );
            await this._collectionParticipant.createIndex(
                { id: 1 },
                { unique: true }
            );
        }

        // Check if the ParticipantApproval collection already exists or create.
        if (collections.find((col) => col.name === this._collectionNameApproval)) {
            this._collectionApproval = db.collection(this._collectionNameApproval);
        } else {
            this._collectionApproval = await db.createCollection(
                this._collectionNameApproval
            );
            await this._collectionApproval.createIndex({ id: 1 }, { unique: true });
        }

        this._initialized = true;
        this._logger.info("MongoDBParticipantsRepo - initialized");
    }

    async create(participant: IParticipant): Promise<boolean> {
        const result = await this._collectionParticipant.insertOne(participant);

        return result.acknowledged;
    }

    async store(participant: IParticipant): Promise<boolean> {
        const result = await this._collectionParticipant.updateOne(
            { id: participant.id },
            {
                $set: {
                    id: participant.id,
                    name: participant.name,
                    isActive: participant.isActive,
                    description: participant.description,
                    createdBy: participant.createdBy,
                    createdDate: participant.createdDate,

                    approved: participant.approved,
                    approvedBy: participant.approvedBy,
                    approvedDate: participant.approvedDate,

                    lastUpdated: participant.approvedDate,
                    participantEndpoints: participant.participantEndpoints,
                    participantAccounts: participant.participantAccounts,
                    participantAccountsChangeRequest: participant.participantAccountsChangeRequest,

                    participantAllowedSourceIps: participant.participantAllowedSourceIps,
                    participantSourceIpChangeRequests: participant.participantSourceIpChangeRequests,

                    fundsMovements: participant.fundsMovements,
                    netDebitCaps: participant.netDebitCaps,
                    netDebitCapChangeRequests: participant.netDebitCapChangeRequests,
                    changeLog: participant.changeLog,

                    participantContacts: participant.participantContacts,
                    participantContactInfoChangeRequests: participant.participantContactInfoChangeRequests
                },
            }
        );
        return result.modifiedCount === 1;
    }

    async destroy(): Promise<void> {
        if (this._initialized) await this._mongoClient.close();
    }
}
