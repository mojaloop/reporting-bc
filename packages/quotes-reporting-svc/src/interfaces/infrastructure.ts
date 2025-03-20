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
- Sithu Kyaw <sithu.kyaw@thitsaworks.com>
*****/

"use strict";

import { IParticipantReport, IBulkQuoteReport, IQuoteReport } from "@mojaloop/reporting-bc-types-lib";


export interface IMongoDbQuotesReportingRepo {
    init(): Promise<void>;

    addQuote(quote: IQuoteReport): Promise<string>;

    addQuotes(quotes: IQuoteReport[]): Promise<void>;

    updateQuote(quote: IQuoteReport): Promise<void>

    updateQuotes(quotes: IQuoteReport[]): Promise<void>;

    removeQuote(id: string): Promise<void>;

    destroy(): Promise<void>;
}

export interface IMongoDbBulkQuotesReportingRepo {
    init(): Promise<void>;

    addBulkQuote(bulkQuote: IBulkQuoteReport): Promise<string>;

    updateBulkQuote(bulkQuote: IBulkQuoteReport): Promise<void>;

    removeBulkQuote(id: string): Promise<void>;

    destroy(): Promise<void>;
}


export interface IQuotesServiceAdapter {
    getQuoteInfo(id: string): Promise<IQuoteReport | null>;
    getQuotesByBulkQuoteId(id: string): Promise<IQuoteReport[] | null>;
    getBulkQuoteInfo(id: string[]): Promise<IBulkQuoteReport | null>;
}

export interface IParticipantsServiceAdapter {
    getParticipantInfo(fspId: string): Promise<IParticipantReport| null>;
    getParticipantsInfo(fspIds: string[]): Promise<IParticipantReport[]|null>;
}

export interface IAccountLookupServiceAdapter {
    getAccountLookup(partyType:string, partyId:string, currency:string | null): Promise<string| null>;
}