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
import { IAuditClient } from "@mojaloop/auditing-bc-public-types-lib";
import {
    CallSecurityContext,
    ForbiddenError,
    IAuthorizationClient
} from "@mojaloop/security-bc-public-types-lib";
import { Row, Workbook } from "exceljs";
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
        this._enforcePrivilege(secCtx, ReportingPrivileges.REPORTING_VIEW_SETTLEMENT_INITIATION_REPORT);


        const result = await this._reportingRepo.getSettlementInitiationByMatrixId(id);
        if (result === null || (Array.isArray(result) && result.length === 0))
            throw new Error(
                `Settlement matrix with ID: '${id}' not found.`
            );

        return result;
    }

    async getSettlementInitiationByMatrixIdExport(secCtx: CallSecurityContext, id: string): Promise<Buffer> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.REPORTING_VIEW_SETTLEMENT_INITIATION_REPORT);

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

        function formatDatetoISOString(value : any){
            return new Date(value).toISOString();        
        }

        const settlementId = settlementInitiation.addRow(["Settlement ID", data[0].matrixId]);
        addBordersToRow(settlementId);
        const settlementDate = settlementInitiation.addRow(["Settlement Created Date", formatDatetoISOString(data[0].settlementCreatedDate)]);
        addBordersToRow(settlementDate);
        const timeZoneOffset = settlementInitiation.addRow(["TimeZoneOffset", "UTC±00:00"]);
        addBordersToRow(timeZoneOffset);
        // Put empty row
        settlementInitiation.addRow(["", ""]);
        // Define the detail table fields
        const details = settlementInitiation.addRow(["Participant", "Participant(Bank Identifier)", "Balance", "Settlement Transfer", "Currency"]);
        addBordersToRow(details);

        type SettlementDateType = string | number | Date;

        // Populate the detail table with data
        data.forEach((dataRow: { matrixId: string; settlementCreatedDate: SettlementDateType; participantId: string; externalBankAccountName: string; externalBankAccountId: string; participantDebitBalance: any; participantCreditBalance: any; participantCurrencyCode: string; }) => {
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

    async getDFSPSettlementDetailExport(secCtx: CallSecurityContext, participantId: string, matrixId: string): Promise<Buffer> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.REPORTING_VIEW_SETTLEMENT_INITIATION_REPORT);

        this._logger.debug("Get DFSPSettlementDetailExport");

        const result = await this._reportingRepo.getDFSPSettlementDetail(participantId,matrixId);
        if (result === null || (Array.isArray(result) && result.length === 0))
            throw new Error(
                `DFSP Settlement Detail with participantId: ${participantId} and matrixId: ${matrixId} not found.`
            );

        const workbook = await this.generateSettlementDetailExcelFile(result, participantId);
        return workbook.xlsx.writeBuffer();
    }

    async generateSettlementDetailExcelFile(data: any, participantId: string): Promise<any> {
       let detailReports = []; 

        detailReports = data.map((detailReport:any) => ({...detailReport,
                        dpspName : participantId === detailReport.payerFspId ? detailReport.payerParticipantName : detailReport.payeeParticipantName,
                        sentAmount: participantId === detailReport.payerFspId ? Number(detailReport.Amount) : 0,
                        receivedAmount: participantId === detailReport.payeeFspId ? Number(detailReport.Amount) : 0,
                        currency: detailReport.Currency,
        }));        

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
                    cell.value === "DFSPID" ||
                    cell.value === "DFSPName" ||
                    cell.value === "TimeZoneOffset" ||
                    cell.value === "Sender DFSP ID" ||
                    cell.value === "Sender DFSP Name" ||
                    cell.value === "Receiver DFSP ID" ||
                    cell.value === "Receiver DFSP Name" ||
                    cell.value === "Transfer ID" ||
                    cell.value === "Tx Type" ||
                    cell.value === "Transaction Date" ||
                    cell.value === "Sender ID Type" ||
                    cell.value === "Sender ID" ||
                    cell.value === "Receiver ID Type" ||
                    cell.value === "Receiver ID" ||
                    cell.value === "Received Amount" ||
                    cell.value === "Sent Amount" ||
                    cell.value === "Fee" ||
                    cell.value === "Currency") {
                    cell.font = { bold: true };
                }
                cell.alignment = { vertical: "middle" };
            });
        }

        function formatDatetoISOString(value : any){
            return new Date(value).toISOString();        
        }

        const workbook = new Workbook();
        const dfspSettlementDetail = workbook.addWorksheet("DFSPSettlementDetailReport");
        
        dfspSettlementDetail.properties.defaultColWidth = 35 ;
        dfspSettlementDetail.properties.defaultRowHeight = 28;

        const settlementId = dfspSettlementDetail.addRow(["Settlement ID", detailReports[0].matrixId]);
        addBordersToRow(settlementId);
        const settlementDate = dfspSettlementDetail.addRow(["Settlement Created Date", formatDatetoISOString(detailReports[0].settlementDate)]);
        addBordersToRow(settlementDate);
        const dfspId = dfspSettlementDetail.addRow(["DFSPID", participantId]);
        addBordersToRow(dfspId);
        const dfspName = dfspSettlementDetail.addRow(["DFSPName", detailReports[0].dpspName]);
        addBordersToRow(dfspName);
        const timeZoneOffset = dfspSettlementDetail.addRow(["TimeZoneOffset", "UTC±00:00"]);
        addBordersToRow(timeZoneOffset);

        dfspSettlementDetail.mergeCells("B1", "C1");
        dfspSettlementDetail.mergeCells("B2", "C2");
        dfspSettlementDetail.mergeCells("B3", "C3");
        dfspSettlementDetail.mergeCells("B4", "C4");
        dfspSettlementDetail.mergeCells("B5", "C5");

        // Put empty rowsettlementInitiation
        dfspSettlementDetail.addRow([]);
        // Define the detail table fields
        const details = dfspSettlementDetail.addRow(["Sender DFSP ID", "Sender DFSP Name", "Receiver DFSP ID", "Receiver DFSP Name", "Transfer ID", "Tx Type", 
                        "Transaction Date", "Sender ID Type", "Sender ID", "Receiver ID Type", "Receiver ID", "Received Amount", "Sent Amount", "Fee", "Currency"]);
        addBordersToRow(details);

        // Populate the detail table with data
        detailReports.forEach((dataRow: { payerFspId: string; payerParticipantName: string; payeeFspId: string; payeeParticipantName: any; transferId: any; transactionType: string; transactionDate:any;
            payerIdType: any; payerIdentifier: any; payeeIdType: any; payeeIdentifier: any; receivedAmount: number; sentAmount: number; currency: string}) => {
            const row = dfspSettlementDetail.addRow([
                dataRow.payerFspId,
                dataRow.payerParticipantName,
                dataRow.payeeFspId,
                dataRow.payeeParticipantName,
                dataRow.transferId,

                dataRow.transactionType,
                formatDatetoISOString(dataRow.transactionDate),
                dataRow.payerIdType,
                dataRow.payerIdentifier,
                dataRow.payeeIdType,

                dataRow.payeeIdentifier,
                "",
                "",
                "-",
                dataRow.currency
            ]);

            const transactionDateCell = row.getCell(7); 

            const receivedAmountCell = row.getCell(12); 
            receivedAmountCell.value = (dataRow.receivedAmount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
 
            const sentAmountCell = row.getCell(13); 
            sentAmountCell.value = (dataRow.sentAmount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
           
            addBordersToRow(row);

            receivedAmountCell.alignment = { vertical:"middle",horizontal:"right" };
            sentAmountCell.alignment = { vertical:"middle",horizontal:"right" };
            transactionDateCell.alignment = { vertical:"middle",horizontal:"right" };
        });

        return workbook;
    }

    async getDFSPSettlementDetail(secCtx: CallSecurityContext, participantId: string, matrixId: string): Promise<any> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.REPORTING_VIEW_DFSP_SETTLEMENT_DETAIL_REPORT);

        const result = await this._reportingRepo.getDFSPSettlementDetail(participantId,matrixId);
        if (result == null)
            throw new Error(
                `DFSP Settlement Detail with participantId: ${participantId} and matrixId: ${matrixId} not found.`
            );

        return result;
    }



    async getDFSPSettlement(secCtx: CallSecurityContext, participantId: string, matrixId: string): Promise<any> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.REPORTING_VIEW_DFSP_SETTLEMENT_REPORT);

        const result = await this._reportingRepo.getDFSPSettlement(participantId,matrixId);
        if (result == null)
            throw new Error(
                `DFSP Settlement with participantId: ${participantId} and matrixId: ${matrixId} not found.`
            );

        return result;
    }

    async getDFSPSettlementExport(secCtx: CallSecurityContext, participantId: string, matrixId: string): Promise<Buffer> {
        this._enforcePrivilege(secCtx, ReportingPrivileges.REPORTING_VIEW_SETTLEMENT_INITIATION_REPORT);

        this._logger.debug("Get getDFSPSettlementExport");

        const result = await this._reportingRepo.getDFSPSettlement(participantId, matrixId);
        if (result === null || (Array.isArray(result) && result.length === 0))
            throw new Error(
                `DFSP Settlement with participantId: ${participantId} and matrixId: ${matrixId} not found.`
            );

        const workbook = await this.generateSettlementExcelFile(result);
        return workbook.xlsx.writeBuffer();
    }

    async generateSettlementExcelFile(data: any): Promise<any> {

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
                    cell.value === "DFSPID" ||
                    cell.value === "DFSPName" ||
                    cell.value === "TimeZoneOffset" ||
                    cell.value === "DFSP ID" ||
                    cell.value === "DFSP Name" ||
                    cell.value === "Sent to FSP" ||
                    cell.value === "Received from FSP" ||
                    cell.value === "Total Transaction Volume" ||
                    cell.value === "Total Value of All Transactions" ||
                    cell.value === "Net Position vs. Each DFSP" ||
                    cell.value === "Currency" ||
                    cell.value === "Aggregated Net Positions") {
                    cell.font = { bold: true };
                }
                cell.alignment = { vertical: "middle" };
            });
        }
        
        function applyBorder(cell:number | string) {
            dfspSettlement.getCell(cell).border = {
                top: {style:"thin"},
                left: {style:"thin"},
                bottom: {style:"thin"},
                right: {style:"thin"}
            };
        }

        function applyFontBold(cell:number | string) {
            dfspSettlement.getCell(cell).font = { bold: true };
        }

        function formatNetPosition(netPosition: number) {
            return netPosition < 0
                ? `(${netPosition.toString().replace("-", "")})`
                : convertDecimalNumber(netPosition);
        }

        function convertDecimalNumber(number: number) {
          return number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
        }

        function formatCommaSeparator(number: number) {
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        
        function getAggregatedNetPositions() {
            return data.reduce(function(accumulator:[{currencyCode:string,value:number}],dataRow:{
                matrixId: string; 
                settlementCreatedDate: string | number | Date;
                relateParticipantId: string ; 
                relateParticipantName:string ;
                totalSentCount: number;
                totalAmountSent:number;
                totalReceivedCount:number;
                totalAmountReceived:number;
                currency: string;
            }){
                const { currency } = dataRow;
                const index = accumulator.findIndex(item => item.currencyCode === currency);

                if (index === -1) {
                 const netPositionValue =  dataRow.totalAmountReceived - dataRow.totalAmountSent;
                 accumulator.push({ currencyCode:currency,value:netPositionValue });
                } else {
                    const value =  dataRow.totalAmountReceived - dataRow.totalAmountSent;
                    accumulator[index].value += value;
                }
                
                return accumulator;
            },[]);
        }

        function formatDatetoISOString(value : any){
            return new Date(value).toISOString();        
        }
        
        const workbook = new Workbook();
        const dfspSettlement = workbook.addWorksheet("DFSPSettlementReport");
        dfspSettlement.properties.defaultColWidth = 25 ;
        dfspSettlement.properties.defaultRowHeight = 26;

        const settlementId = dfspSettlement.addRow(["Settlement ID", data[0].matrixId]);
        addBordersToRow(settlementId);
        const settlementDate = dfspSettlement.addRow(["Settlement Created Date", formatDatetoISOString(data[0].settlementDate)]);
        addBordersToRow(settlementDate);
        const dfspId = dfspSettlement.addRow(["DFSPID", data[0].paramParticipantId]);
        addBordersToRow(dfspId);
        const dfspName = dfspSettlement.addRow(["DFSPName", data[0].paramParticipantName]);
        addBordersToRow(dfspName);
        const timeZoneOffset = dfspSettlement.addRow(["TimeZoneOffset", "UTC±00:00"]);
        applyFontBold("A5");
        addBordersToRow(timeZoneOffset);

        dfspSettlement.mergeCells("B1", "C1");
        dfspSettlement.mergeCells("B2", "C2");
        dfspSettlement.mergeCells("B3", "C3");
        dfspSettlement.mergeCells("B4", "C4");
        dfspSettlement.mergeCells("B5", "C5");
               
        // Put empty rowsettlementInitiation
        dfspSettlement.addRow([]);
        // Define the detail table fields
        const details = dfspSettlement.addRow(["DFSPID", "DFSPName", "Sent to FSP","", "Received from FSP","", "Total Transaction Volume","Total Value of All Transactions","Net Position vs. Each DFSP","Currency"]);
        
        dfspSettlement.mergeCells("C7:D7");
        dfspSettlement.mergeCells("E7:F7");
        dfspSettlement.mergeCells("G7:G8");
        dfspSettlement.mergeCells("H7:H8");
        dfspSettlement.mergeCells("I7:I8");
        dfspSettlement.mergeCells("J7:J8");

        dfspSettlement.getCell("C8").value="Volume";
        dfspSettlement.getCell("D8").value="Value";
        dfspSettlement.getCell("E8").value="Volume";
        dfspSettlement.getCell("F8").value="Value";

        applyBorder("B8");
        applyFontBold("B8");

        applyBorder("C8");
        applyFontBold("C8");

        applyBorder("D8");
        applyFontBold("D8");
        
        applyBorder("E8");
        applyFontBold("E8");
        
        applyBorder("F8");
        applyFontBold("F8");
        
        addBordersToRow(details);

        // Populate the detail table with data
        data.forEach((dataRow: { matrixId: string; settlementCreatedDate: string | number | Date; relateParticipantId: string ; relateParticipantName:string ;totalSentCount: number;totalAmountSent:number;
            totalReceivedCount:number;totalAmountReceived:number;currency: string; }) => {
            const row = dfspSettlement.addRow([
                dataRow.relateParticipantId,
                dataRow.relateParticipantName,
                "",
                "",
                "",
                "",
                "",
                "",
                formatNetPosition(dataRow.totalAmountReceived - dataRow.totalAmountSent),
                dataRow.currency
            ]);

            const totalSentCount = row.getCell(3);
            totalSentCount.value = formatCommaSeparator(dataRow.totalSentCount);

            const totalReceivedCount = row.getCell(5);
            totalReceivedCount.value = formatCommaSeparator(dataRow.totalReceivedCount);

            const totalTransactionCell = row.getCell(7);
            totalTransactionCell.value = formatCommaSeparator(dataRow.totalSentCount + dataRow.totalReceivedCount);

            const totalAmountSentCell = row.getCell(4);
            totalAmountSentCell.value = convertDecimalNumber(dataRow.totalAmountSent);

            const totalAmountReceivedCell = row.getCell(6);
            totalAmountReceivedCell.value = convertDecimalNumber(dataRow.totalAmountReceived);
            
            const totalValueAllTransactions = row.getCell(8);
            totalValueAllTransactions.value = convertDecimalNumber(dataRow.totalAmountSent + dataRow.totalAmountReceived);

            const netPositionVsEachDFSP = row.getCell(9);

            addBordersToRow(row);
            totalSentCount.alignment = { vertical:"middle",horizontal:"right" };
            totalReceivedCount.alignment = { vertical:"middle",horizontal:"right" };
            totalTransactionCell.alignment = { vertical:"middle",horizontal:"right" };
            totalAmountSentCell.alignment = { vertical:"middle",horizontal:"right" };
            totalAmountReceivedCell.alignment = { vertical:"middle",horizontal:"right" };
            totalValueAllTransactions.alignment = { vertical:"middle",horizontal:"right" };
            netPositionVsEachDFSP.alignment = { vertical:"middle",horizontal:"right" };
        });

        dfspSettlement.addRow([]);

        const aggregatedNetPositions = getAggregatedNetPositions();
        const aggregateNetPositionsHeader = dfspSettlement.addRow(["Aggregated Net Positions"]);
        const cellA1 = aggregateNetPositionsHeader.getCell(1);
        
        // Merge the cell with adjacent columns (for example, merge with 2 columns to the right)
        const column = Number(cellA1.col + 1 ); 
        const mergeEndColumn = String.fromCharCode(column + 65 - 1); // Convert to ASCII character (A=65)

        dfspSettlement.mergeCells(`A${cellA1.row}:${mergeEndColumn}${cellA1.row}`);
        addBordersToRow(aggregateNetPositionsHeader);

        aggregatedNetPositions.forEach((dataRow: { currencyCode: string; value: number }) => {
            const row = dfspSettlement.addRow([
                dataRow.currencyCode,
                "",
            ]);

            const aggreateValue = row.getCell(2);
            aggreateValue.value = convertDecimalNumber(dataRow.value);

            addBordersToRow(row);
            aggreateValue.alignment = { vertical:"middle",horizontal:"right" };
        });

        return workbook;
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
