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
 export declare enum ParticipantTypes {
    "HUB" = "HUB",
    "DFSP" = "DFSP"
}
export declare enum ParticipantFundsMovementDirections {
    "FUNDS_DEPOSIT" = "FUNDS_DEPOSIT",
    "FUNDS_WITHDRAWAL" = "FUNDS_WITHDRAWAL"
}
export declare enum ParticipantAllowedSourceIpsPortModes {
    "ANY" = "ANY",
    "SPECIFIC" = "SPECIFIC",
    "RANGE" = "RANGE"
}
export declare enum ParticipantEndpointTypes {
    "FSPIOP" = "FSPIOP",
    "ISO20022" = "ISO20022"
}
export declare enum ParticipantEndpointProtocols {
    "HTTPs/REST" = "HTTPs/REST"
}
export declare enum ParticipantAccountTypes {
    "FEE" = "FEE",
    "POSITION" = "POSITION",
    "SETTLEMENT" = "SETTLEMENT",
    "HUB_MULTILATERAL_SETTLEMENT" = "HUB_MULTILATERAL_SETTLEMENT",
    "HUB_RECONCILIATION" = "HUB_RECONCILIATION"
}
export declare enum ParticipantNetDebitCapTypes {
    "ABSOLUTE" = "ABSOLUTE",
    "PERCENTAGE" = "PERCENTAGE"
}
export declare enum ParticipantChangeTypes {
    "CREATE" = "CREATE",
    "APPROVE" = "APPROVE",
    "ACTIVATE" = "ACTIVATE",
    "DEACTIVATE" = "DEACTIVATE",
    "ADD_ACCOUNT_REQUEST" = "ADD_ACCOUNT_REQUEST",
    "ACCOUNT_CHANGE_REQUEST_APPROVED" = "ACCOUNT_CHANGE_REQUEST_APPROVED",
    "CHANGE_ACCOUNT_BANK_DETAILS_REQUEST" = "CHANGE_ACCOUNT_BANK_DETAILS_REQUEST",
    "ADD_ACCOUNT" = "ADD_ACCOUNT",
    "CHANGE_ACCOUNT_BANK_DETAILS" = "CHANGE_ACCOUNT_BANK_DETAILS",
    "REMOVE_ACCOUNT" = "REMOVE_ACCOUNT",
    "ADD_SOURCE_IP_REQUEST" = "ADD_SOURCE_IP_REQUEST",
    "CHANGE_SOURCE_IP_REQUEST" = "CHANGE_SOURCE_IP_REQUEST",
    "REMOVE_SOURCE_IP_REQUEST" = "REMOVE_SOURCE_IP_REQUEST",
    "APPROVE_SOURCE_IP_REQUEST" = "APPROVE_SOURCE_IP_REQUEST",
    "ADD_SOURCE_IP" = "ADD_SOURCE_IP",
    "CHANGE_SOURCE_IP" = "CHANGE_SOURCE_IP",
    "REMOVE_SOURCE_IP" = "REMOVE_SOURCE_IP",
    "ADD_ENDPOINT" = "ADD_ENDPOINT",
    "REMOVE_ENDPOINT" = "REMOVE_ENDPOINT",
    "CHANGE_ENDPOINT" = "CHANGE_ENDPOINT",
    "FUNDS_DEPOSIT" = "FUNDS_DEPOSIT",
    "FUNDS_WITHDRAWAL" = "FUNDS_WITHDRAWAL",
    "NDC_CHANGE" = "NDC_CHANGE",
    "NDC_RECALCULATED" = "NDC_RECALCULATED",
    "ADD_CONTACT_INFO_REQUEST" = "ADD_CONTACT_INFO_REQUEST",
    "CHANGE_CONTACT_INFO_REQUEST" = "CHANGE_CONTACT_INFO_REQUEST",
    "REMOVE_CONTACT_INFO_REQUEST" = "REMOVE_CONTACT_INFO_REQUEST",
    "APPROVE_CONTACT_INFO_REQUEST" = "APPROVE_CONTACT_INFO_REQUEST",
    "ADD_CONTACT_INFO" = "ADD_CONTACT_INFO",
    "CHANGE_CONTACT_INFO" = "CHANGE_CONTACT_INFO",
    "REMOVE_CONTACT_INFO" = "REMOVE_CONTACT_INFO"
}
