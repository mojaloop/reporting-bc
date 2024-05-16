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
import { ApprovalRequestState, ParticipantChangeTypes } from "./enums";

export declare interface IParticipantReport {
    id: string;
    name: string;
    type: "HUB" | "DFSP" | "FXP";
    isActive: boolean;
    description: string;

    createdBy: string;
    createdDate: number;

    approved: boolean;
    approvedBy: string | null;
    approvedDate: number | null;

    lastUpdated: number;

    participantAllowedSourceIps: {
        id: string;
        cidr: string;
        portMode: "ANY" | "SPECIFIC" | "RANGE";
        ports?: number[];
        portRange?: {
            rangeFirst: number;
            rangeLast: number;
        };
    }[];
    participantSourceIpChangeRequests: {
        id: string;
        cidr: string;
        portMode: "ANY" | "SPECIFIC" | "RANGE";
        ports?: number[];
        portRange?: {
            rangeFirst: number;
            rangeLast: number;
        };
        allowedSourceIpId: string | null;
        createdBy: string;
        createdDate: number;
        requestState: ApprovalRequestState;
        approvedBy: string | null;
        approvedDate: number | null;
        rejectedBy: string | null;
        rejectedDate: number | null;
        requestType: "ADD_SOURCE_IP" | "CHANGE_SOURCE_IP"
    }[];

    participantEndpoints: {
        id: string;
        type: "FSPIOP" | "ISO20022";
        protocol: "HTTPs/REST";
        value: string;
    }[];
    participantAccounts: {
        id: string;
        type: "FEE" | "POSITION" | "SETTLEMENT" | "HUB_MULTILATERAL_SETTLEMENT" | "HUB_RECONCILIATION";
        currencyCode: string;
        debitBalance: string | null;
        creditBalance: string | null;
        balance: string | null;
        externalBankAccountId: string | null;
        externalBankAccountName: string | null;
    }[];
    participantAccountsChangeRequest: {
        id: string;
        accountId: string | null;
        type: "FEE" | "POSITION" | "SETTLEMENT" | "HUB_MULTILATERAL_SETTLEMENT" | "HUB_RECONCILIATION";
        currencyCode: string;
        externalBankAccountId: string | null;
        externalBankAccountName: string | null;
        createdBy: string;
        createdDate: number;
        requestState: ApprovalRequestState;
        approvedBy: string | null;
        approvedDate: number | null;
        rejectedBy: string | null;
        rejectedDate: number | null;
        requestType: "ADD_ACCOUNT" | "CHANGE_ACCOUNT_BANK_DETAILS";
    }[];

    fundsMovements: {
        id: string;
        createdBy: string;
        createdDate: number;
        requestState: ApprovalRequestState;
        approvedBy: string | null;
        approvedDate: number | null;
        rejectedBy: string | null;
        rejectedDate: number | null;
        type: "OPERATOR_FUNDS_DEPOSIT"| "OPERATOR_FUNDS_WITHDRAWAL"| "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_CREDIT" 
               | "MATRIX_SETTLED_AUTOMATIC_ADJUSTMENT_DEBIT"| "OPERATOR_LIQUIDITY_ADJUSTMENT_CREDIT"| "OPERATOR_LIQUIDITY_ADJUSTMENT_DEBIT";
        currencyCode: string;
        amount: string;
        transferId: string | null;
        extReference: string | null;
        note: string | null;
    }[];
    changeLog: {
        changeType:ParticipantChangeTypes;
        user: string;
        timestamp: number;
        notes: string | null;
    }[];

    netDebitCaps: {
        currencyCode: string;
        type:  "ABSOLUTE"|"PERCENTAGE";
        percentage: number | null;
        currentValue: number;
    }[];
    netDebitCapChangeRequests: {
        id: string;
        createdBy: string;
        createdDate: number;
        approvedBy: string | null;
        approvedDate: number | null;
        currencyCode: string;
        type: "ABSOLUTE"|"PERCENTAGE";
        percentage: number | null;
        fixedValue: number | null;
        extReference: string | null;
        note: string | null;
    }[];

    participantContacts: {
        id: string;
        name: string;
        email: string;
        phoneNumber: string;
        role: string;
    }[];
    participantContactInfoChangeRequests: {
        id: string;
        name: string;
        email: string;
        phoneNumber: string;
        role: string;
        contactInfoId: string | null;
        createdBy: string;
        createdDate: number;
        approvedBy: string | null;
        approvedDate: number | null;
        requestType: "ADD_PARTICIPANT_CONTACT_INFO" | "CHANGE_PARTICIPANT_CONTACT_INFO";
    }[];

    participantStatusChangeRequests: {
        id: string;
        isActive: boolean;
        createdBy: string;
        createdDate: number;
        requestState: ApprovalRequestState;
        
        approvedBy: string | null;
        approvedDate: number | null;
        rejectedBy: string | null;
        rejectedDate: number | null;
        requestType: "CHANGE_PARTICIPANT_STATUS";
    }[];
  }

