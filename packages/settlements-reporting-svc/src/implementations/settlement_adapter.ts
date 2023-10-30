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

 * ThitsaWorks
 - Myo Min Htet <myo.htet@thitsaworks.com>

 --------------
 **/

"use strict";

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { ISettlementMatrix, ISettlementBatch, ISettlementBatchTransfer } from "@mojaloop/reporting-bc-types-lib";
import { IAuthenticatedHttpRequester } from "@mojaloop/security-bc-public-types-lib";
import { AuthenticatedHttpRequester } from "@mojaloop/security-bc-client-lib";
import { ISettlementServiceAdapter } from "../types/settlement_adapter_interface";

export class SettlementsAdapter implements ISettlementServiceAdapter {
	private readonly _logger: ILogger;
	private readonly _settlementSVCBaseUrl: string;
	private readonly _authNSvcTokenUrl: string;
	private readonly _clientId: string;
	private readonly _clientSecret: string;
	private validateStatus = (status: number): boolean => status === 200;

	constructor(
		logger: ILogger,
		settlementSVCBaseUrl: string,
		authNSvcTokenUrl: string,
		clientId: string,
		clientSecret: string,

	) {
		this._logger = logger.createChild(this.constructor.name);
		this._settlementSVCBaseUrl = settlementSVCBaseUrl;
		this._authNSvcTokenUrl = authNSvcTokenUrl;
		this._clientId = clientId;
		this._clientSecret = clientSecret;
	}


	async getSettlementMatrixByMatrixId(matrixId: string): Promise<ISettlementMatrix | null> {
		try {
			this._logger.info(`Get Settlement matrix by Matirx ID: ${matrixId}.`);
			const authRequester: IAuthenticatedHttpRequester = new AuthenticatedHttpRequester(this._logger, this._authNSvcTokenUrl);
			authRequester.setAppCredentials(this._clientId, this._clientSecret);

			const url = new URL(`/matrix/${matrixId}/`, this._settlementSVCBaseUrl).toString();
			const resp = await authRequester.fetch(url);

			if (resp.status != 200) {
				throw new Error("SettlementMatrix could not get settlement matrix");
			}

			const data = await resp.json();

			return Promise.resolve(data);
		} catch (e: unknown) {
			this._logger.error(e, `getSettlementMatrix: error getting matrix info for matrixId: ${matrixId} - ${e}`);
			return Promise.reject(e);
		}
	}

	async getBatchByBatchId(batchId: string): Promise<ISettlementBatch | null> {
		try {
			this._logger.info(`Get Batch by Batch ID: ${batchId} `);

			const authRequester: IAuthenticatedHttpRequester = new AuthenticatedHttpRequester(this._logger, this._authNSvcTokenUrl);
			authRequester.setAppCredentials(this._clientId, this._clientSecret);

			const url = new URL(`/batches/${batchId}/`, this._settlementSVCBaseUrl).toString();
			const resp = await authRequester.fetch(url);

			if (resp.status != 200) {
				throw new Error("SettlementMatrix could not get settlement batches");
			}

			const data = await resp.json();

			return Promise.resolve(data);
		} catch (e: unknown) {
			this._logger.error(e, `getBatchesByMatrixId: error getting batches info for matrixId: ${batchId} - ${e}`);
			return Promise.reject(e);
		}
	}

	async getSettlementBatchTransfersByMatrixId(matrixId: string): Promise<ISettlementBatchTransfer[] | null> {
		try {

			this._logger.info(`Get settlement batch transfers by Matrix ID: ${matrixId}.`);
			const authRequester: IAuthenticatedHttpRequester = new AuthenticatedHttpRequester(this._logger, this._authNSvcTokenUrl);
			authRequester.setAppCredentials(this._clientId, this._clientSecret);
			
			const url = new URL(`/transfers?matrixId=${matrixId}`, this._settlementSVCBaseUrl).toString();
			const resp = await authRequester.fetch(url);

			if (resp.status != 200) {
				throw new Error("SettlementMatrix could not get settlement transfers");
			}

			const data = await resp.json();

			return Promise.resolve(data);
		} catch (e: unknown) {
			this._logger.error(e, `getTransfersByMatrixId: error getting transfers info for matrixId: ${matrixId} - ${e}`);
			return Promise.reject(e);
		}
	}

}
