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
import { IMessage, IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { SettlementMatrixSettledEvt, SettlementsBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
import { ISettlementsReportingRepo } from "../types/mongodb_repo_interface";
import { ISettlementServiceAdapter } from "../types/settlement_adapter_interface";

export class SettlementReportingEventHandler {
    private readonly _logger: ILogger;
    private readonly _consumer: IMessageConsumer;
    private readonly _settlementRepo: ISettlementsReportingRepo;
    private readonly _settlementAdapter: ISettlementServiceAdapter;

    constructor(
        consumer: IMessageConsumer,
        logger: ILogger,
        settlementRepo: ISettlementsReportingRepo,
        settlementAdapter: ISettlementServiceAdapter) {
        this._logger = logger.createChild(this.constructor.name);
        this._consumer = consumer;
        this._settlementRepo = settlementRepo;
        this._settlementAdapter = settlementAdapter;
    }

    async start(): Promise<void> {
        this._consumer.setTopics([SettlementsBCTopics.DomainEvents]);
        this._consumer.setCallbackFn(this._msgHandler.bind(this));
        await this._consumer.connect();
        await this._consumer.startAndWaitForRebalance();

        this._logger.info("SettlementsReportingEventHandler started.");
    }

    async stop(): Promise<void> {
        await this._consumer.stop();
    }

    private async _msgHandler(message: IMessage): Promise<void> {
        // eslint-disable-next-line no-async-promise-executor
        return await new Promise<void>(async (resolve) => {
            this._logger.debug(`Got message in SettlementsReportingEventHandler with name: ${message.msgName}`);
            try {

                if (message.msgName === SettlementMatrixSettledEvt.name) {
                    await this.handleSettlementMatrixSettledEvt(message as SettlementMatrixSettledEvt);

                } else {
                    // ignore message, don't bother logging
                }

            } catch (err: unknown) {
                this._logger.error(err, `SettlementsReportingEventHandler - processing command - ${message?.msgName}:${message?.msgKey}:${message?.msgId} - Error: ${(err as Error)?.message?.toString()}`);
            } finally {
                resolve();
            }
        });
    }

    private async handleSettlementMatrixSettledEvt(event: SettlementMatrixSettledEvt): Promise<void> {
   
        this._logger.info("Got SettlementMatrixSettledEven info.");

        if (!event.payload.settlementMatrixId) {
            throw new Error("Invalid matrix Id");
        }
        // get up to date matrix info
        const matrix = await this._settlementAdapter.getSettlementMatrixByMatrixId(event.payload.settlementMatrixId);

        if (!matrix) {
            throw new Error(`Matrix not found with ID: ${event.payload.settlementMatrixId}`);
        }

        for (const matrixBatch of matrix.batches) {
            if (!matrixBatch) {
                this._logger.info(`Matrix ID: ${matrix.id} does not have batches.`);
            } else {
                //get batch
                const batch = await this._settlementAdapter.getBatchByBatchId(matrixBatch?.id);
                if (batch) {
                    //store batche
                    await this._settlementRepo.storeBatch(batch);
                }
            }
        }
        //get transfers with matrix
        const settlementTransfers = await this._settlementAdapter.getSettlementBatchTransfersByMatrixId(matrix.id);
        if (!settlementTransfers) {
            this._logger.info(`Matrix ID: ${matrix.id} does not have transfers.`);
        } else {
            //store transfers
            for (const settlementTransfer of settlementTransfers.items) {
                const transfer = await this._settlementRepo.getTransferById(settlementTransfer.transferId);
                if(transfer){                    
                    transfer.batchId = settlementTransfer.batchId;
                    transfer.batchName = settlementTransfer.batchName;
                    transfer.journalEntryId = settlementTransfer.journalEntryId;
                    transfer.matrixId = matrix.id;
                    await this._settlementRepo.storeTransfer(transfer);
                }                
            }
        }

        //store matrix
        await this._settlementRepo.storeMatrix(matrix);

    }
}