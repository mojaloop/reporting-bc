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
*****/

"use strict";

import {
    TransferFulfiledEvt,
    TransferPreparedEvt,
    TransferRejectRequestProcessedEvt,
    TransfersBCTopics,
    TransferPreparedEvtPayload,
    TransferFulfiledEvtPayload,
    TransferRejectRequestProcessedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IMessage, IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";

import { UnableToGetTransferError } from "../implementations/errors";
import { ITransfersReportingRepo } from "../types/infrastructure";
import { ITransferReport } from "@mojaloop/reporting-bc-types-lib";



export class TransfersReportingEventHandler {
    private _logger: ILogger;
    private _messageConsumer: IMessageConsumer;
    private _transferRpRepo: ITransfersReportingRepo;

    constructor(logger: ILogger, messageConsumer: IMessageConsumer, transferRpRepo: ITransfersReportingRepo) {
        this._logger = logger.createChild(this.constructor.name);
        this._messageConsumer = messageConsumer;
        this._transferRpRepo = transferRpRepo;
    }

    async start(): Promise<void> {
        // create and start the consumer handler
        this._messageConsumer.setTopics([TransfersBCTopics.DomainRequests, TransfersBCTopics.DomainEvents, TransfersBCTopics.TimeoutEvents]);

        this._messageConsumer.setBatchCallbackFn(this._batchMsgHandler.bind(this));
        await this._messageConsumer.connect();
        await this._messageConsumer.startAndWaitForRebalance();
    }

    private async _batchMsgHandler(receivedMessages: IMessage[]): Promise<void> {
        console.log(`Got message batch in TransfersEventHandler batch size: ${receivedMessages.length}`);

        // this needs to never break
        // eslint-disable-next-line no-async-promise-executor
        return await new Promise<void>(async (resolve) => {
            try {
                for (const message of receivedMessages) {
                    if (message.msgName === TransferPreparedEvt.name) {
                        await this._handleTransferPreparedEvt(message as TransferPreparedEvt);
                    } else if (message.msgName === TransferFulfiledEvt.name) {
                        await this._handleTransferFulfiledEvt(message as TransferFulfiledEvt);
                    } else if (message.msgName === TransferRejectRequestProcessedEvt.name) {
                        await this._handleTransferRejectRequestProcessedEvt(message as TransferRejectRequestProcessedEvt);
                    } else {
                        // ignore unhandled event - don't fail
                    }
                }

            } catch (error) {
                this._logger.error(error);
            } finally {
                resolve();
            }
        });
    }

    private async _handleTransferPreparedEvt(event: TransferPreparedEvt): Promise<void> {
        const now = Date.now();
        const payload: TransferPreparedEvtPayload = event.payload;

        try {
            const transfer: ITransferReport = {
                createdAt: now,
                updatedAt: now,
                transferId: payload.transferId,
                payeeFspId: payload.payeeFsp,
                payerFspId: payload.payerFsp,
                amount: payload.amount,
                currencyCode: payload.currencyCode,
                expirationTimestamp: payload.expiration,
                transferState: "RESERVED",
                completedTimestamp: null,
                extensionList: null,
                errorInformation: null,
                settlementModel: payload.settlementModel,
                preparedAt: payload.preparedAt,
                fulfiledAt: null,
                batchId: "",
                batchName: "",
                journalEntryId: "",
                matrixId: null
            };

            await this._transferRpRepo.addTransfer(transfer);

        } catch (e: unknown) {
            const errMsg = `Error while adding transfer with transfer ID ${payload.transferId}: ${(e as Error).message}`;
            this._logger.error(errMsg);
        }
    }

    private async _handleTransferFulfiledEvt(event: TransferFulfiledEvt): Promise<void> {
        const payload: TransferFulfiledEvtPayload = event.payload;

        try {
            const existingTransfer = await this._transferRpRepo.getTransferById(payload.transferId);
            if (!existingTransfer) {
                throw new UnableToGetTransferError();
            }

            const updatedTransfer: ITransferReport = {
                ...existingTransfer,
                updatedAt: Date.now(),
                transferState: "COMMITTED",
                completedTimestamp: payload.completedTimestamp,
                extensionList: payload.extensionList,
                fulfiledAt: payload.fulfiledAt,
            };

            await this._transferRpRepo.updateTransfer(updatedTransfer);

        } catch (e: unknown) {
            const errMsg = `Error while updating transfer with transfer ID ${payload.transferId}: ${(e as Error).message}`;
            this._logger.error(errMsg);
        }
    }

    private async _handleTransferRejectRequestProcessedEvt(event: TransferRejectRequestProcessedEvt): Promise<void> {
        const payload: TransferRejectRequestProcessedEvtPayload = event.payload;

        try {
            const existingTransfer = await this._transferRpRepo.getTransferById(payload.transferId);
            if (!existingTransfer) {
                throw new UnableToGetTransferError();
            }

            const updatedTransfer: ITransferReport = {
                ...existingTransfer,
                transferState: "ABORTED",
                errorInformation: payload.errorInformation,
            };

            await this._transferRpRepo.updateTransfer(updatedTransfer);

        } catch (e: unknown) {
            const errMsg = `Error while updating transfer with transfer ID ${payload.transferId}: ${(e as Error).message}`;
            this._logger.error(errMsg);
        }
    }
}
