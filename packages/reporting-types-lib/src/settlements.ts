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

 * ThitsaWorks
 - Myo Min Htet <myo.htet@thitsaworks.com>

 --------------
 ******/

 "use strict";

 export interface ICustomSettlementField {
    key: string;
    value: ICustomSettlementField | ICustomSettlementField[] | string | number;
}

 export interface ISettlementConfig {
    id: string;
    /**
     * Settlement model name, should be unique.
     * @todo rename to modelName
     */
    settlementModel: string;
    /**
     * Batch duration interval in seconds
     * @todo rename to batchCreateIntervalSecs
     */
    batchCreateInterval: number;
    settlementTime: string | null;
    isAutoClose: boolean;
    isActive: boolean;
    customSettlementField: ICustomSettlementField[] | null;
    createdBy: string;
    createdDate: number;
    changeLog: ISettlementModelActivityLogEntry[];
}
export declare interface ISettlementModelActivityLogEntry {
    changeType: "CREATE" | "APPROVE" | "ACTIVATE" | "DEACTIVATE" | "UPDATE";
    user: string;
    timestamp: number;
    notes: string | null;
}
export interface ISettlementBatch {
    id: string;
    timestamp: number;
    settlementModel: string;
    currencyCode: string;
    batchName: string;
    batchSequence: number;
    state: "OPEN" | "DISPUTED" | "SETTLED" | "CLOSED";
    accounts: ISettlementBatchAccount[];
}
export interface ISettlementBatchAccount {
    accountExtId: string;
    participantId: string;
    currencyCode: string;
    creditBalance: string;
    debitBalance: string;
}
export interface ISettlementBatchTransfer {
    transferId: string;
    transferTimestamp: number;
    payerFspId: string;
    payeeFspId: string;
    currencyCode: string;
    amount: string;
    batchId: string;
    batchName: string;
    journalEntryId: string;
    matrixId: string | null;
}

/*******************
* Settlement Matrix
********************/
export interface ISettlementMatrix {
    id: string;
    createdAt: number;
    updatedAt: number;
    dateFrom: number | null;
    dateTo: number | null;
    currencyCode: string;
    settlementModel: string | null;
    batches: ISettlementMatrixBatch[];
    participantBalances: ISettlementMatrixParticipantBalance[];
    participantBalancesDisputed: ISettlementMatrixParticipantBalance[];
    state: "IDLE" | "BUSY" | "DISPUTED" | "CLOSED" | "SETTLED";
    type: "STATIC" | "DYNAMIC";
    generationDurationSecs: number | null;
    totalDebitBalance: string;
    totalCreditBalance: string;
    totalDebitBalanceDisputed: string;
    totalCreditBalanceDisputed: string;
}
export interface ISettlementMatrixParticipantBalance {
    participantId: string;
    debitBalance: string;
    creditBalance: string;
}
export interface ISettlementMatrixBatch {
    id: string;
    name: string;
    batchDebitBalance: string;
    batchCreditBalance: string;
    state: "OPEN" | "DISPUTED" | "SETTLED" | "CLOSED";
    batchAccounts?: ISettlementMatrixBatchAccount[];
}
export interface ISettlementMatrixBatchAccount {
    id: string;
    participantId: string;
    accountExtId: string;
    debitBalance: string;
    creditBalance: string;
}

export type SearchReults = {
    pageIndex: number;
    pageSize: number;
    totalPages: number;
};

export type BatchTransferSearchResults = SearchReults & {
    items: ISettlementBatchTransfer[];
};