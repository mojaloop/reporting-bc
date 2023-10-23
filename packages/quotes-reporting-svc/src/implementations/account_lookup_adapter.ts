/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { AccountLookupHttpClient } from "@mojaloop/account-lookup-bc-client-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-public-types-lib";
import { IAccountLookupServiceAdapter } from "../interfaces/infrastructure";
import { GetAccountLookupAdapterError } from "../types/errors";

const HTTP_CLIENT_TIMEOUT_MS = 10_000;

export class AccountLookupAdapter implements IAccountLookupServiceAdapter {
    private readonly _logger: ILogger;
    private readonly _clientBaseUrl: string;
    private readonly _externalAccountLookupClient: AccountLookupHttpClient;
    private readonly _authRequester: IAuthenticatedHttpRequester;
    private readonly _requestTimeout: number;

    constructor(
        logger: ILogger,
        clientBaseUrl: string,
        authRequester: IAuthenticatedHttpRequester,
        requestTimeout: number = HTTP_CLIENT_TIMEOUT_MS
    ) {
        this._logger = logger;
        this._clientBaseUrl = clientBaseUrl;
        this._authRequester = authRequester;
        this._requestTimeout = requestTimeout;
        this._externalAccountLookupClient = new AccountLookupHttpClient(logger, this._clientBaseUrl, this._authRequester, this._requestTimeout);
    }

    async getAccountLookup(partyType: string, partyId: string, currency: string | null): Promise<string | null> {
        try {
            this._logger.info(`getAccountLookup: calling external account lookup service for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);
            const result = await this._externalAccountLookupClient.participantLookUp(partyType, partyId, currency);
            this._logger.info(`getAccountLookup: caching result for partyId: ${partyId}, partyType ${partyType}, currency: ${currency}`);

            if (result) {
                return result;
            }
            return null;

        } catch (e: unknown) {
            this._logger.error(`getAccountLookup: error getting for partyId: ${partyId}, partyType: ${partyType}, currency: ${currency} - ${e}`);
            throw new GetAccountLookupAdapterError("Error calling external account lookup service");
        }
    }

}
