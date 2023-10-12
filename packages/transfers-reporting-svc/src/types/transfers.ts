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

// NOTE: these types should be optimized for the reporting needs and should never reference the internal types (can obviously be similar if that is of interest)

export declare const enum TransferState {
    RECEIVED = "RECEIVED", 		// initial state
	RESERVED = "RESERVED", 		// after prepare
	REJECTED = "REJECTED", 		// could not prepare (ex: no liquidity)
    COMMITTED = "COMMITTED", 	// after fulfil (final state of successful transfer)
    ABORTED = "ABORTED", 		// this should not be called like this
    EXPIRED = "EXPIRED"			// system changed it expired (need the timeout mechanism)
}

export interface IExtensionList {
    extension: { key: string; value: string;}[];
}

export interface IErrorInformation {
    errorCode: string;
    errorDescription: string;
}

export interface IDailyTransferStats {
    //day is the identifier - format 2023-12-27 (use ISO format)
    day: string;
    totalTransfersCount: number;
    transfersPerParticipant: {
        participantId: string
        totalCount: number;
    }
    totalAmountPerCurrency:{
        currencyCode: string
        totalAmount: string
    }
}

export interface IReportingTransferObject {
	createdAt: number;
	updatedAt: number;
	transferId: string;
	payeeFspId: string;
	payerFspId: string;
	amount: string;
	currencyCode: string;
	ilpPacket: string;				// move to opaque object
	condition: string;				// move to opaque object
	fulfilment: string | null,		// move to opaque object
	expirationTimestamp: number;
	transferState: TransferState,
	completedTimestamp: number | null,

    extensionList: IExtensionList | null;
    errorInformation: IErrorInformation | null;

	// populated from the settlements lib during prepare
	settlementModel: string | "DEFAULT";
	// hash: string;
}