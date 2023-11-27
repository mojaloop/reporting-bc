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
 - Myo Min Htet <myo.htet@thitsaworks.com>",
 - Sithu Kyaw <sithu.kyaw@thitsaworks.com>",
 - Zwe Htet Myat <zwehtet.myat@thitsaworks.com>"

 --------------
 ******/

"use strict";


import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IReportingRepo } from "../types";
import { AuditSecurityContext, IAuditClient, } from "@mojaloop/auditing-bc-public-types-lib";
import {
    CallSecurityContext,
    ForbiddenError,
    IAuthorizationClient,
    MakerCheckerViolationError,
    UnauthorizedError,
} from "@mojaloop/security-bc-public-types-lib";
import { Row, Workbook } from "exceljs";
import * as fs from "fs";
import { time } from "console";
import { ReportingPrivileges } from "./privilege_names";

export class ReportingAggregate {
    private _logger: ILogger;
    private _auditClient: IAuditClient;
    private _authorizationClient: IAuthorizationClient;
    private readonly _reportingRepo: IReportingRepo;

    constructor(
        logger: ILogger,
        auditClient: IAuditClient,
        authorizationClient: IAuthorizationClient,
        reportingRepo: IReportingRepo,
    ) {
        this._logger = logger;
        this._auditClient = auditClient;
        this._authorizationClient = authorizationClient;
        this._reportingRepo = reportingRepo;
    }

    private _enforcePrivilege(secCtx: CallSecurityContext, privName: string): void {
        for (const roleId of secCtx.platformRoleIds) {
            if (this._authorizationClient.roleHasPrivilege(roleId, privName)) return;
        }
        throw new ForbiddenError(
            `Required privilege "${privName}" not held by caller`
        );
    }

    async getSettlementInitiationByMatrixId(secCtx: CallSecurityContext, id: string): Promise<any> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.VIEW_SETTLEMENT_INITIATION_REPORT);


        const result = await this._reportingRepo.getSettlementInitiationByMatrixId(id);
        if (result === null || (Array.isArray(result) && result.length === 0))
            throw new Error(
                `Settlement matrix with ID: '${id}' not found.`
            );

        return result;
    }

    async getSettlementInitiationByMatrixIdExport(secCtx: CallSecurityContext, id: string): Promise<Buffer> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.VIEW_SETTLEMENT_INITIATION_REPORT);

        this._logger.debug("Get settlementInitiationbyMatrixIdExport");

        const result = await this._reportingRepo.getSettlementInitiationByMatrixId(id);
        if (result === null || (Array.isArray(result) && result.length === 0))
            throw new Error(
                `Settlement matrix with ID: '${id}' not found.`
            );

        const workbook = await this.generateExcelFile(result);
        return workbook.xlsx.writeBuffer();
    }

    async generateExcelFile(data: any): Promise<any> {

        // Function to add borders to a row
        function addBordersToRow(row: Row) {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: "thin" },
                    right: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                };
                if (cell.value === "Settlement ID" ||
                    cell.value === "Settlement Created Date" ||
                    cell.value === "TimeZoneOffset" ||
                    cell.value === "Participant" ||
                    cell.value === "Participant(Bank Identifier)" ||
                    cell.value === "Balance" ||
                    cell.value === "Settlement Transfer" ||
                    cell.value === "Currency") {
                    cell.font = { bold: true };
                }
                cell.alignment = { vertical: "middle" };
            });
        }

        const workbook = new Workbook();
        const settlementInitiation = workbook.addWorksheet("SettlementInitiation");

        const date = new Date(data[0].settlementCreatedDate);

        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true, // Use 12-hour format
        };

        const formatter = new Intl.DateTimeFormat("en-US", options);
        const formattedDate = formatter.format(date);
        // Split the formatted date string
        const [month, day, year, time] = formattedDate.replaceAll(",","").split(" ");
        // Reconstruct the date in the desired format
        const finalFormattedDate = `${day}-${month}-${year} ${time}`;

        const settlementId = settlementInitiation.addRow(["Settlement ID", data[0].matrixId]);
        addBordersToRow(settlementId);
        const settlementDate = settlementInitiation.addRow(["Settlement Created Date", finalFormattedDate]);
        addBordersToRow(settlementDate);
        const timeZoneOffset = settlementInitiation.addRow(["TimeZoneOffset", "UTC±00:00"]);
        addBordersToRow(timeZoneOffset);
        // Put empty row
        settlementInitiation.addRow(["", ""]);
        // Define the detail table fields
        const details = settlementInitiation.addRow(["Participant", "Participant(Bank Identifier)", "Balance", "Settlement Transfer", "Currency"]);
        addBordersToRow(details);

        // Populate the detail table with data
        data.forEach((dataRow: { matrixId: string; settlementCreatedDate: string | number | Date; participantId: string; externalBankAccountName: string; externalBankAccountId: string; participantDebitBalance: any; participantCreditBalance: any; participantCurrencyCode: string; }) => {
            const row = settlementInitiation.addRow([
                dataRow.participantId,
                dataRow.externalBankAccountName + " " + dataRow.externalBankAccountId,
                "", // Default empty Balance
                "",
                dataRow.participantCurrencyCode,
            ]);

            const balanceCell = row.getCell(4); // Get the specific cell you want to format (index starts from 1)

            balanceCell.value = (dataRow.participantCreditBalance - dataRow.participantDebitBalance).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
            balanceCell.alignment = { horizontal: "right" }; // Apply alignment to the cell

            addBordersToRow(row);
            balanceCell.alignment = { vertical:"middle",horizontal:"right" };
        });

        return workbook;
    }

    async getDFSPSettlementDetail(secCtx: CallSecurityContext, participantId: string, matrixId: string): Promise<any> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.VIEW_DFSP_SETTLEMENT_DETAIL_REPORT);

        const result = await this._reportingRepo.getDFSPSettlementDetail(participantId,matrixId);
        if (result == null)
            throw new Error(
                `DFSP Settlement Detail with participantId: ${participantId} and matrixId: ${matrixId} not found.`
            );

        return result;
    }

    async getDFSPSettlement(secCtx: CallSecurityContext, participantId: string, matrixId: string): Promise<any> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.VIEW_DFSP_SETTLEMENT_REPORT);

        const result = await this._reportingRepo.getDFSPSettlement(participantId,matrixId);
        if (result == null)
            throw new Error(
                `DFSP Settlement with participantId: ${participantId} and matrixId: ${matrixId} not found.`
            );

        return result;
    }

    async getSettlementMatricesByDfspNameAndFromDateToDate(secCtx: CallSecurityContext, participantId: string, startDate: number, endDate: number): Promise<any> {
        // this._enforcePrivilege(secCtx, ParticipantPrivilegeNames.VIEW_PARTICIPANT);

        const result = await this._reportingRepo.getSettlementMatricesByDfspNameAndFromDateToDate(participantId,startDate, endDate);
        if (result == null)
            throw new Error(
                `Matrices with participantId: ${participantId}, StartDate: ${startDate} and EndDate: ${endDate} not found.`
            );

        return result;
    }
}
