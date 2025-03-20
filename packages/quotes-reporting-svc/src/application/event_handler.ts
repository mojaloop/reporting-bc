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

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { DomainEventMsg, IMessage, IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {
    QuoteBCUnableToAddQuoteToDatabaseErrorEvent,
    QuoteBCUnableToAddQuoteToDatabaseErrorPayload, 
    QuotingBCTopics
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
	QuoteRequestReceivedEvt, QuoteResponseReceivedEvt
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IAccountLookupServiceAdapter, IMongoDbQuotesReportingRepo, IParticipantsServiceAdapter } from "../interfaces/infrastructure";
import {
	IQuoteReport, IQuoteSchemeRules
} from "@mojaloop/reporting-bc-types-lib";



export class QuotesReportingEventHandler {
	private readonly _logger: ILogger;
	private readonly _consumer: IMessageConsumer;
	private readonly _repo: IMongoDbQuotesReportingRepo;
	// private readonly _participantAdapter: IParticipantsServiceAdapter;
	private readonly _accountlookupAdapter: IAccountLookupServiceAdapter;
	private readonly _passThroughMode: boolean;
	private readonly _schemeRules: IQuoteSchemeRules;

	constructor(
		consumer: IMessageConsumer,
		logger: ILogger,
		quoteRepo: IMongoDbQuotesReportingRepo,
		accountlookupAdapter: IAccountLookupServiceAdapter,
		passThroughMode: boolean,
		schemeRules: IQuoteSchemeRules
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._consumer = consumer;
		this._repo = quoteRepo;
		this._accountlookupAdapter = accountlookupAdapter;
		// this._participantAdapter = participantAdapter;
		this._passThroughMode = passThroughMode;
		this._schemeRules = schemeRules;
	}

	async start(): Promise<void> {
		this._consumer.setTopics([QuotingBCTopics.DomainRequests,QuotingBCTopics.DomainEvents]);
		this._consumer.setCallbackFn(this._msgHandler.bind(this));
		await this._consumer.connect();
		await this._consumer.startAndWaitForRebalance();

		this._logger.info("QuotesReportingEventHandler started.");
	}

	async stop(): Promise<void> {
		await this._consumer.stop();
	}

	private async _msgHandler(message: IMessage): Promise<void> {
		// eslint-disable-next-line no-async-promise-executor
		return await new Promise<void>(async (resolve) => {
			this._logger.debug(`Got message in QuotesEventHandler with name: ${message.msgName}`);
			try {

                // in reporting we listen only to events outputed by the target BC, never the ones coming in to it
                // only QuoteRequestAcceptedEvt and QuoteResponseAccepted
                // and the error events coming out of the quoting bc

				if (message.msgName === QuoteRequestReceivedEvt.name) {
					await this.handleQuoteRequestReceivedEvt(message as QuoteRequestReceivedEvt);
				} else if (message.msgName === QuoteResponseReceivedEvt.name) {
					await this.handleQuoteResponseReceivedEvt(message as QuoteResponseReceivedEvt);
				} else {
					// ignore message, don't bother logging
				}

			} catch (err: unknown) {
				this._logger.error(err, `QuotesEventHandler - processing command - ${message?.msgName}:${message?.msgKey}:${message?.msgId} - Error: ${(err as Error)?.message?.toString()}`);
			} finally {
				resolve();
			}
		});
	}

	private async handleQuoteRequestReceivedEvt(message: QuoteRequestReceivedEvt): Promise<void> {

		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);
		
		const quote: IQuoteReport = {
			quoteId: message.payload.quoteId,
			bulkQuoteId: null,
			requesterFspId: message.fspiopOpaqueState.requesterFspId,
			destinationFspId: message.fspiopOpaqueState.destinationFspId,
			transactionId: message.payload.transactionId,
			payee: message.payload.payee,
			payer: message.payload.payer,
			amountType: message.payload.amountType,
			amount: message.payload.amount,
			transactionType: message.payload.transactionType,
			feesPayer: message.payload.fees,
			transactionRequestId: message.payload.transactionRequestId,
			geoCode: message.payload.geoCode,
			note: message.payload.note,
			expiration: message.payload.expiration,
			extensionList: message.payload.extensionList,
			payeeReceiveAmount: null,
			payeeFspFee: null,
			payeeFspCommission: null,
			status: "PENDING",
			condition: null,
			totalTransferAmount: null,
			ilpPacket: null,
			errorInformation: null,
			transferAmount: message.payload.amount
		};

		if (!this._passThroughMode) {
			try {
				this._repo.addQuote(quote);
			} catch (error: any) {
				this._logger.error(`Error adding quote to database: ${error}`);
				const errorPayload: QuoteBCUnableToAddQuoteToDatabaseErrorPayload = {
					errorDescription: "Unable to add quote to database",
					quoteId
				};
				const errorEvent = new QuoteBCUnableToAddQuoteToDatabaseErrorEvent(errorPayload);
				throw errorEvent;

			}
		}
	}

	private async handleQuoteResponseReceivedEvt(message: QuoteResponseReceivedEvt): Promise<void> {
		const quoteId = message.payload.quoteId;
		this._logger.debug(`Got handleQuoteRequestReceivedEvt msg for quoteId: ${quoteId}`);

		const quoteStatus = "ACCEPTED";

		if (!this._passThroughMode) {
			const quote: Partial<IQuoteReport> = {
				quoteId: message.payload.quoteId,
				condition: message.payload.condition,
				expiration: message.payload.expiration,
				extensionList: message.payload.extensionList,
				geoCode: message.payload.geoCode,
				ilpPacket: message.payload.ilpPacket,
				payeeFspCommission: message.payload.payeeFspCommission,
				payeeFspFee: message.payload.payeeFspFee,
				payeeReceiveAmount: message.payload.payeeReceiveAmount,
				transferAmount: message.payload.transferAmount,
				status: quoteStatus as "RECEIVED" | "PENDING" | "REJECTED" | "ACCEPTED" | "EXPIRED"  | null
			};

			try {
				await this._repo.updateQuote(quote as IQuoteReport);
			} catch (error: any) {
				this._logger.error(`Error updating quote: ${error.message}`);
			}
		}
	}	
}
