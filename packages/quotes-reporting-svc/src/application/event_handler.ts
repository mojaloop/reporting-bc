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
 - Myo Min Htet <myo.htet@thitsaworks.com>
 - Sithu Kyaw <sithu.kyaw@thitsaworks.com>

 --------------
 ******/
"use strict";

import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { DomainEventMsg, IMessage, IMessageConsumer } from "@mojaloop/platform-shared-lib-messaging-types-lib";
import { QuoteBCBulkQuoteExpiredErrorEvent, QuoteBCBulkQuoteExpiredErrorPayload, QuoteBCDestinationParticipantNotFoundErrorEvent, QuoteBCDestinationParticipantNotFoundErrorPayload, QuoteBCInvalidDestinationFspIdErrorEvent, QuoteBCInvalidDestinationFspIdErrorPayload, QuoteBCInvalidRequesterFspIdErrorEvent, QuoteBCInvalidRequesterFspIdErrorPayload, QuoteBCQuoteExpiredErrorEvent, QuoteBCQuoteExpiredErrorPayload, QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent, QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload, QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent, QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload, QuoteBCRequesterParticipantNotFoundErrorEvent, QuoteBCRequesterParticipantNotFoundErrorPayload, QuoteBCUnableToAddQuoteToDatabaseErrorEvent, QuoteBCUnableToAddQuoteToDatabaseErrorPayload, QuoteRequestAcceptedEvt, QuoteResponseAccepted, QuotingBCTopics } from "@mojaloop/platform-shared-lib-public-messages-lib";
import {
	QuoteRequestReceivedEvt, QuoteResponseReceivedEvt
} from "@mojaloop/platform-shared-lib-public-messages-lib";
import { IAccountLookupServiceAdapter, IMongoDbQuotesReportingRepo, IParticipantsServiceAdapter } from "../interfaces/infrastructure";
import {
	IParticipantReport, IQuoteReport, IQuoteSchemeRules, QuoteStatus
} from "@mojaloop/reporting-bc-types-lib";



export class QuotesReportingEventHandler {
	private readonly _logger: ILogger;
	private readonly _consumer: IMessageConsumer;
	private readonly _repo: IMongoDbQuotesReportingRepo;
	private readonly _participantAdapter: IParticipantsServiceAdapter;
	private readonly _accountlookupAdapter: IAccountLookupServiceAdapter;
	private readonly _passThroughMode: boolean;
	private readonly _schemeRules: IQuoteSchemeRules;

	constructor(
		consumer: IMessageConsumer,
		logger: ILogger,
		quoteRepo: IMongoDbQuotesReportingRepo,
		accountlookupAdapter: IAccountLookupServiceAdapter,
		participantAdapter: IParticipantsServiceAdapter,
		passThroughMode: boolean,
		schemeRules: IQuoteSchemeRules
	) {
		this._logger = logger.createChild(this.constructor.name);
		this._consumer = consumer;
		this._repo = quoteRepo;
		this._accountlookupAdapter = accountlookupAdapter;
		this._participantAdapter = participantAdapter;
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

		return await new Promise<void>(async (resolve) => {
			this._logger.debug(`Got message in QuotesEventHandler with name: ${message.msgName}`);
			try {

				if (message.msgName === QuoteRequestReceivedEvt.name) {
					await this.handleQuoteRequestReceivedEvt(message as QuoteRequestReceivedEvt);
				} else if (message.msgName === QuoteResponseReceivedEvt.name) {
					await this.handleQuoteResponseReceivedEvt(message as QuoteResponseReceivedEvt)
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
		const requesterFspId = message.payload.payer?.partyIdInfo?.fspId ?? message.fspiopOpaqueState.requesterFspId ?? null;
		let destinationFspId = message.payload.payee?.partyIdInfo?.fspId ?? message.fspiopOpaqueState.destinationFspId ?? null;
		const expirationDate = message.payload.expiration ?? null;

		const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);

		if (requesterParticipantError) {
			throw requesterParticipantError;
		}

		const isSchemaValid = this.validateScheme(message);
		if (!isSchemaValid) {
			const errorPayload: QuoteBCQuoteRuleSchemeViolatedRequestErrorPayload = {
				quoteId,
				errorDescription: `Quote request scheme validation failed for quoteId: ${quoteId}`
			};
			const errorEvent = new QuoteBCQuoteRuleSchemeViolatedRequestErrorEvent(errorPayload);
			throw errorEvent;
		}

		if (!destinationFspId) {
			const payeePartyId = message.payload.payee?.partyIdInfo?.partyIdentifier ?? null;
			const payeePartyType = message.payload.payee?.partyIdInfo?.partyIdType ?? null;
			const currency = message.payload.amount?.currency ?? null;
			this._logger.debug(`Get destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`);
			destinationFspId = await this._accountlookupAdapter.getAccountLookup(payeePartyType, payeePartyId, currency)
				.catch((error: Error) => {
					this._logger.error(`Error while getting destinationFspId from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency} - ${error}`);
					return null;
				});
			this._logger.debug(`Got destinationFspId: ${destinationFspId ?? null} from account lookup service for payeePartyId: ${payeePartyId}, payeePartyIdType: ${payeePartyType}, currency: ${currency}`);
		}

		const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null);
		if (destinationParticipantError) {
			throw destinationParticipantError;
		}

		if (expirationDate) {
			const expirationDateValidationError = this.validateExpirationDateOrGetErrorEvent(quoteId, null, expirationDate);
			if (expirationDateValidationError) {
				throw expirationDateValidationError;
			}
		}

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
			status: QuoteStatus.PENDING,
			condition: null,
			totalTransferAmount: null,
			ilpPacket: null,
			errorInformation: null,
			transferAmount: message.payload.amount
		};

		if (!this._passThroughMode) {
			try {
				this._repo.addQuote(quote);
			}
			catch (error: any) {
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

		const requesterFspId = message.fspiopOpaqueState?.requesterFspId;
		const destinationFspId = message.fspiopOpaqueState?.destinationFspId;
		const expirationDate = message.payload.expiration ?? null;
		let quoteErrorEvent: DomainEventMsg | null = null;
		let quoteStatus: QuoteStatus = QuoteStatus.ACCEPTED;

		const isSchemaValid = this.validateScheme(message);
		if (!isSchemaValid) {
			const errorPayload: QuoteBCQuoteRuleSchemeViolatedResponseErrorPayload = {
				errorDescription: `Quote request scheme validation failed for quoteId: ${quoteId}`,
				quoteId
			};
			quoteErrorEvent = new QuoteBCQuoteRuleSchemeViolatedResponseErrorEvent(errorPayload);
		}

		if (quoteErrorEvent === null) {
			const requesterParticipantError = await this.validateRequesterParticipantInfoOrGetErrorEvent(requesterFspId, quoteId, null);
			if (requesterParticipantError) {
				quoteErrorEvent = requesterParticipantError;
				quoteStatus = QuoteStatus.REJECTED;
			}
		}

		if (quoteErrorEvent === null) {
			const destinationParticipantError = await this.validateDestinationParticipantInfoOrGetErrorEvent(destinationFspId, quoteId, null);
			if (destinationParticipantError) {
				quoteErrorEvent = destinationParticipantError;
				quoteStatus = QuoteStatus.REJECTED;
			}
		}

		if (quoteErrorEvent !== null) {
			const expirationDateError = this.validateExpirationDateOrGetErrorEvent(quoteId, null, expirationDate);
			if (expirationDateError) {
				quoteErrorEvent = expirationDateError;
				quoteStatus = QuoteStatus.EXPIRED;
			}
		}

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
				status: quoteStatus
			};

			try {
				await this._repo.updateQuote(quote as IQuoteReport);
			}
			catch (error: any) {
				this._logger.error(`Error updating quote: ${error.message}`);
				/* const errorPayload : QuoteBCUnableToUpdateQuoteInDatabaseErrorPayload = {
					errorDescription: "Unable to update quote in database",
					quoteId
				};
				const errorEvent = new QuoteBCUnableToUpdateQuoteInDatabaseErrorEvent(errorPayload);
				return errorEvent; */

			}
		}
	}

	private validateScheme(message: IMessage): boolean {
		const currency = message.payload.transferAmount?.currency ?? message.payload.amount?.currency;
		if (!currency) {
			this._logger.error("Currency is not sent in the request");
			return false;
		}

		const currenciesSupported = this._schemeRules.currencies.map((currency) => currency.toLocaleLowerCase());

		if (!currenciesSupported.includes(currency.toLocaleLowerCase())) {
			this._logger.error("Currency is not supported");
			return false;
		}

		return true;
	}

	private async validateDestinationParticipantInfoOrGetErrorEvent(participantId: string, quoteId: string | null, bulkQuoteId: string | null): Promise<DomainEventMsg | null> {
		let participant: IParticipantReport | null = null;

		if (!participantId) {
			const errorMessage = `Payee fspId is null or undefined`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				destinationFspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		participant = await this._participantAdapter.getParticipantInfo(participantId)
			.catch((error: any) => {
				this._logger.error(`Error getting payee info for id: ${participantId} - ${error?.message}`);
				return null;
			});

		if (!participant) {
			const errorMessage = `Payee participant not found for participantId: ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCDestinationParticipantNotFoundErrorPayload = {
				quoteId,
				bulkQuoteId,
				errorDescription: errorMessage,
				destinationFspId: participantId,
			};
			const errorEvent = new QuoteBCDestinationParticipantNotFoundErrorEvent(errorPayload);
			return errorEvent;
		}

		if (participant.id !== participantId) {
			const errorMessage = `Payee participant id mismatch with expected ${participant.id} - ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidDestinationFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				destinationFspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidDestinationFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
		// 	this._logger.debug(`${participant.id} is not active`);
		// 	throw new RequiredParticipantIsNotActive();
		// }
		return null;
	}

	private async validateRequesterParticipantInfoOrGetErrorEvent(participantId: string, quoteId: string | null, bulkQuoteId: string | null): Promise<DomainEventMsg | null> {
		let participant: IParticipantReport | null = null;

		if (!participantId) {
			const errorMessage = `Payer fspId is null or undefined`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				requesterFspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidRequesterFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		participant = await this._participantAdapter.getParticipantInfo(participantId)
			.catch((error: any) => {
				this._logger.error(`Error getting payer info for fspId: ${participantId} - ${error?.message}`);
				return null;
			});

		if (!participant) {
			const errorMessage = `Payer participant not found for fspId: ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCRequesterParticipantNotFoundErrorPayload = {
				quoteId,
				bulkQuoteId,
				errorDescription: errorMessage,
				//TODO: add property
				requesterFspId: participantId,
			};
			const errorEvent = new QuoteBCRequesterParticipantNotFoundErrorEvent(errorPayload);
			return errorEvent;
		}

		if (participant.id !== participantId) {
			const errorMessage = `Payee participant fspId mismatch with expected ${participant.id} - ${participantId}`;
			this._logger.error(errorMessage);
			const errorPayload: QuoteBCInvalidRequesterFspIdErrorPayload = {
				bulkQuoteId,
				errorDescription: errorMessage,
				requesterFspId: participantId,
				quoteId
			};
			const errorEvent = new QuoteBCInvalidRequesterFspIdErrorEvent(errorPayload);
			return errorEvent;
		}

		// TODO enable participant.isActive check once this is implemented over the participants side
		// if(!participant.isActive) {
		// 	this._logger.debug(`${participant.id} is not active`);
		// 	throw new RequiredParticipantIsNotActive();
		// }
		return null;
	}

	private validateExpirationDateOrGetErrorEvent(quoteId: string | null, bulkQuoteId: string | null, expirationDate: string): DomainEventMsg | null {
		const serverDateUtc = new Date().toISOString();
		const serverDate = new Date(serverDateUtc);
		const quoteDate = new Date(expirationDate);

		const differenceDate = quoteDate.getTime() - serverDate.getTime();

		if (differenceDate < 0) {
			if (bulkQuoteId) {
				const errorMessage = `BulkQuote with id ${bulkQuoteId} has expired`;
				this._logger.error(errorMessage);
				const errorPayload: QuoteBCBulkQuoteExpiredErrorPayload = {
					errorDescription: errorMessage,
					bulkQuoteId,
					expirationDate,
				};
				const errorEvent = new QuoteBCBulkQuoteExpiredErrorEvent(errorPayload);
				return errorEvent;
			}
			else {
				const errorMessage = `Quote with id ${quoteId} has expired at ${expirationDate}`;
				this._logger.error(errorMessage);
				const errorPayload: QuoteBCQuoteExpiredErrorPayload = {
					errorDescription: errorMessage,
					quoteId: quoteId as string,
					expirationDate,
				};
				const errorEvent = new QuoteBCQuoteExpiredErrorEvent(errorPayload);
				return errorEvent;
			}
		}

		return null;
	}
}