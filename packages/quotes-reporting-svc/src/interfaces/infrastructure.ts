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
 - Sithu Kyaw <sithu.kyaw@thitsaworks.com>

 --------------
 ******/

"use strict";

import { IParticipant } from "../../../reporting-types-lib/dist/participants";
import { IBulkQuote, IQuote } from "../../../reporting-types-lib/dist/quotes";



export interface IMongoDbQuotesReportingRepo {
    init(): Promise<void>;

    addQuote(quote: IQuote): Promise<string>;

    addQuotes(quotes: IQuote[]): Promise<void>;

    updateQuote(quote: IQuote): Promise<void>

    updateQuotes(quotes: IQuote[]): Promise<void>;

    removeQuote(id: string): Promise<void>;

    destroy(): Promise<void>;
}

export interface IMongoDbBulkQuotesReportingRepo {
    init(): Promise<void>;

    addBulkQuote(bulkQuote: IBulkQuote): Promise<string>;

    updateBulkQuote(bulkQuote: IBulkQuote): Promise<void>;

    removeBulkQuote(id: string): Promise<void>;

    destroy(): Promise<void>;
}


export interface IQuotesServiceAdapter {
    getQuoteInfo(id: string): Promise<IQuote | null>;
    getQuotesByBulkQuoteId(id: string): Promise<IQuote[] | null>;
    getBulkQuoteInfo(id: string[]): Promise<IBulkQuote | null>;
}

export interface IParticipantsServiceAdapter {
    getParticipantInfo(fspId: string): Promise<IParticipant| null>;
    getParticipantsInfo(fspIds: string[]): Promise<IParticipant[]|null>;
}

export interface IAccountLookupServiceAdapter {
    getAccountLookup(partyType:string, partyId:string, currency:string | null): Promise<string| null>;
}