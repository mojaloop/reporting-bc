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

//NOTE: Only declare enums for actual reporting types, never re-declare/re-define enums from other packages (like source bcs)

export enum FundsMovementTypes {
    OPERATOR_FUNDS_DEPOSIT = "OPERATOR_FUNDS_DEPOSIT",
    OPERATOR_FUNDS_WITHDRAWAL = "OPERATOR_FUNDS_WITHDRAWAL",
    MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_CREDIT = "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_CREDIT",
    MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_DEBIT = "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_DEBIT",
    OPERATOR_LIQUIDITY_ADJUSTMENT_CREDIT = "OPERATOR_LIQUIDITY_ADJUSTMENT_CREDIT",
    OPERATOR_LIQUIDITY_ADJUSTMENT_DEBIT = "OPERATOR_LIQUIDITY_ADJUSTMENT_DEBIT"
}

export enum ApprovalRequestState {
	CREATED = "CREATED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}

export enum ParticipantChangeTypes {
	"CREATE"= "CREATE",
	"APPROVE"= "APPROVE",
	"ACTIVATE"= "ACTIVATE",
	"DEACTIVATE"= "DEACTIVATE",
	"ADD_ACCOUNT_REQUEST"= "ADD_ACCOUNT_REQUEST",
	"ACCOUNT_CHANGE_REQUEST_APPROVED"= "ACCOUNT_CHANGE_REQUEST_APPROVED",
	"ACCOUNT_CHANGE_REQUEST_REJECTED"= "ACCOUNT_CHANGE_REQUEST_REJECTED",
    "CHANGE_ACCOUNT_BANK_DETAILS_REQUEST"= "CHANGE_ACCOUNT_BANK_DETAILS_REQUEST",
	"ADD_ACCOUNT"= "ADD_ACCOUNT",
	"CHANGE_ACCOUNT_BANK_DETAILS"= "CHANGE_ACCOUNT_BANK_DETAILS",
	"REMOVE_ACCOUNT"= "REMOVE_ACCOUNT",

    "ADD_SOURCE_IP_REQUEST"= "ADD_SOURCE_IP_REQUEST",
    "CHANGE_SOURCE_IP_REQUEST"= "CHANGE_SOURCE_IP_REQUEST",
	"REMOVE_SOURCE_IP_REQUEST"= "REMOVE_SOURCE_IP_REQUEST",
	"APPROVE_SOURCE_IP_REQUEST"= "APPROVE_SOURCE_IP_REQUEST",
	"REJECT_SOURCE_IP_REQUEST"= "REJECT_SOURCE_IP_REQUEST",
	"ADD_SOURCE_IP"= "ADD_SOURCE_IP",
	"CHANGE_SOURCE_IP"= "CHANGE_SOURCE_IP",
	"REMOVE_SOURCE_IP"= "REMOVE_SOURCE_IP",

    "ADD_ENDPOINT"= "ADD_ENDPOINT",
	"REMOVE_ENDPOINT"= "REMOVE_ENDPOINT",
	"CHANGE_ENDPOINT"= "CHANGE_ENDPOINT",
	
	"OPERATOR_FUNDS_DEPOSIT" = "OPERATOR_FUNDS_DEPOSIT",
    "OPERATOR_FUNDS_WITHDRAWAL" = "OPERATOR_FUNDS_WITHDRAWAL",
    "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_CREDIT" = "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_CREDIT",
    "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_DEBIT" = "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_DEBIT",
    "OPERATOR_LIQUIDITY_ADJUSTMENT_CREDIT" = "OPERATOR_LIQUIDITY_ADJUSTMENT_CREDIT",
    "OPERATOR_LIQUIDITY_ADJUSTMENT_DEBIT" = "OPERATOR_LIQUIDITY_ADJUSTMENT_DEBIT",

	"NDC_CHANGE"="NDC_CHANGE",
	"NDC_RECALCULATED"="NDC_RECALCULATED",

	"ADD_CONTACT_INFO_REQUEST"= "ADD_CONTACT_INFO_REQUEST",
    "CHANGE_CONTACT_INFO_REQUEST"= "CHANGE_CONTACT_INFO_REQUEST",
	"REMOVE_CONTACT_INFO_REQUEST"= "REMOVE_CONTACT_INFO_REQUEST",
	"APPROVE_CONTACT_INFO_REQUEST"= "APPROVE_CONTACT_INFO_REQUEST",
	"ADD_CONTACT_INFO"= "ADD_CONTACT_INFO",
	"CHANGE_CONTACT_INFO"= "CHANGE_CONTACT_INFO",
	"REMOVE_CONTACT_INFO"= "REMOVE_CONTACT_INFO",
	"ENABLE_PARTICIPANT"= "ENABLE_PARTICIPANT",
	"DISABLE_PARTICIPANT"= "DISABLE_PARTICIPANT",
    "CHANGE_PARTICIPANT_STATUS_REQUEST"= "CHANGE_PARTICIPANT_STATUS_REQUEST",
	"APPROVE_PARTICIPANT_STATUS_REQUEST" = "APPROVE_PARTICIPANT_STATUS_REQUEST",
	"REJECT_PARTICIPANT_STATUS_REQUEST" = "REJECT_PARTICIPANT_STATUS_REQUEST"
}