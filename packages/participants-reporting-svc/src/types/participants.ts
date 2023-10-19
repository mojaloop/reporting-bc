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

 * ThitsaWorks
 - Myo Min Htet <myo.htet@thitsaworks.com>

 --------------
******/
"use strict";

import { ParticipantAccountTypes, ParticipantAllowedSourceIpsPortModes, ParticipantChangeTypes, ParticipantEndpointProtocols, ParticipantEndpointTypes, ParticipantFundsMovementDirections, ParticipantNetDebitCapTypes, ParticipantTypes } from "./enums";

export declare interface IParticipant {
    id: string;
    name: string;
    type: ParticipantTypes;
    isActive: boolean;
    description: string;

    createdBy: string;
    createdDate: number;

    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;

    lastUpdated: number;

    participantAllowedSourceIps: IParticipantAllowedSourceIp[];
    participantSourceIpChangeRequests: IParticipantSourceIpChangeRequest[];

    participantEndpoints: IParticipantEndpoint[];
    participantAccounts: IParticipantAccount[];
    participantAccountsChangeRequest: IParticipantAccountChangeRequest[];

    fundsMovements: IParticipantFundsMovement[];
    changeLog: IParticipantActivityLogEntry[];

    netDebitCaps: IParticipantNetDebitCap[];
    netDebitCapChangeRequests: IParticipantNetDebitCapChangeRequest[];

    participantContacts: IParticipantContactInfo[];
    participantContactInfoChangeRequests: IParticipantContactInfoChangeRequest[];
  }
  
  
export declare interface IParticipantNetDebitCap {
    currencyCode: string;
    type: ParticipantNetDebitCapTypes;
    percentage: number | null;
    currentValue: number;
}
export declare interface IParticipantNetDebitCapChangeRequest {
    id: string;
    createdBy: string;
    createdDate: number;
    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;
    currencyCode: string;
    type: ParticipantNetDebitCapTypes;
    percentage: number | null;
    fixedValue: number | null;
    extReference: string | null;
    note: string | null;
}
export declare interface IParticipantFundsMovement {
    id: string;
    createdBy: string;
    createdDate: number;
    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;
    direction: ParticipantFundsMovementDirections;
    currencyCode: string;
    amount: string;
    transferId: string | null;
    extReference: string | null;
    note: string | null;
}
export declare interface IParticipantAllowedSourceIp {
    id: string;
    cidr: string;
    portMode: ParticipantAllowedSourceIpsPortModes;
    ports?: number[];
    portRange?: {
        rangeFirst: number;
        rangeLast: number;
    };
}
export declare interface IParticipantSourceIpChangeRequest extends IParticipantAllowedSourceIp {
    allowedSourceIpId: string | null;
    createdBy: string;
    createdDate: number;
    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;
    requestType: "ADD_SOURCE_IP" | "CHANGE_SOURCE_IP";
}
export declare interface IParticipantEndpoint {
    id: string;
    type: ParticipantEndpointTypes;
    protocol: ParticipantEndpointProtocols;
    value: string;
}
export declare interface IParticipantAccount {
    id: string;
    type: ParticipantAccountTypes;
    currencyCode: string;
    debitBalance: string | null;
    creditBalance: string | null;
    balance: string | null;
    externalBankAccountId: string | null;
    externalBankAccountName: string | null;
}
export declare interface IParticipantAccountChangeRequest {
    id: string;
    accountId: string | null;
    type: ParticipantAccountTypes;
    currencyCode: string;
    externalBankAccountId: string | null;
    externalBankAccountName: string | null;
    createdBy: string;
    createdDate: number;
    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;
    requestType: "ADD_ACCOUNT" | "CHANGE_ACCOUNT_BANK_DETAILS";
}
export declare interface IParticipantActivityLogEntry {
    changeType: ParticipantChangeTypes;
    user: string;
    timestamp: number;
    notes: string | null;
}
export declare interface IParticipantContactInfo {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: string;
}
export declare interface IParticipantContactInfoChangeRequest extends IParticipantContactInfo {
    contactInfoId: string | null;
    createdBy: string;
    createdDate: number;
    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;
    requestType: "ADD_PARTICIPANT_CONTACT_INFO" | "CHANGE_PARTICIPANT_CONTACT_INFO";
}
