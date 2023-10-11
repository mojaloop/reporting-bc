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
    TransferFulfiledEvt,
    TransferPreparedEvt,
    TransferRejectRequestProcessedEvt,
    TransfersBCTopics,
    TransferPreparedEvtPayload,
} from "@mojaloop/platform-shared-lib-public-messages-lib";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IMessage, IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { IReportingTransferObject, TransferState } from "../types/transfers";


export class TransfersReportingEventHandler{
    private _logger: ILogger;
    private _messageConsumer: IMessageConsumer;

    constructor(logger:ILogger, messageConsumer: IMessageConsumer) {
        this._logger = logger.createChild(this.constructor.name);
        this._messageConsumer = messageConsumer;
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

        const transfer: IReportingTransferObject = {
            createdAt: now,
            updatedAt: now,
            transferId: payload.transferId,
            payeeFspId: payload.payeeFsp,
            payerFspId: payload.payerFsp,
            amount: payload.amount,
            currencyCode: payload.currencyCode,
            ilpPacket: payload.ilpPacket,
            condition: payload.condition,
            expirationTimestamp: payload.expiration,
            transferState: TransferState.RESERVED,
            fulfilment: null,
            completedTimestamp: null,
            settlementModel: "DEFAULT", // Set as DEFAULT for now
        };


    }

    private async _handleTransferFulfiledEvt(event: TransferFulfiledEvt):Promise<void>{
        // TODO update the reporting db with the new state of this transfer (now fulfiled)

        // TODO update day totals
    }

    private async _handleTransferRejectRequestProcessedEvt(event: TransferRejectRequestProcessedEvt): Promise<void> {
        // TODO update the reporting db with the new state of this transfer (rejected)
    }

}
