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

"use strict";

import express from "express";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { TokenHelper } from "@mojaloop/security-bc-client-lib";
import { IAuthorizationClient } from "@mojaloop/security-bc-public-types-lib";
import { IReportingRepo } from "../../types";
import { BaseRoutes } from "./base_routes";
import { ReportingAggregate } from "../../domain/aggregate";


export class ExpressRoutes extends BaseRoutes {

    constructor(
        logger: ILogger,
        tokenHelper: TokenHelper,
        authorizationClient: IAuthorizationClient,
        reportingRepo: IReportingRepo,
        aggregate: ReportingAggregate,
    ) {
        super(logger, reportingRepo, tokenHelper, authorizationClient, aggregate);

        // endpoints
        this.mainRouter.get("/settlementMatrixIds", this.getSettlementMatrixIds.bind(this));

        // pass ?format=excel to receive excel instead of JSON
        this.mainRouter.get("/settlementInitiationByMatrixId/:id", this.getSettlementInitiationByMatrixId.bind(this));

        this.mainRouter.get("/dfspSettlementDetail", this.getDFSPSettlementDetail.bind(this));
        this.mainRouter.get("/dfspSettlement", this.getDFSPSettlement.bind(this));
    }

    private async getSettlementInitiationByMatrixId(req: express.Request, res: express.Response): Promise<void> {
        const id = req.params["id"] ?? null;
        const excelFormat = req.query.format && (req.query.format as string).toUpperCase() === "EXCEL" ? true : false;
        this.logger.debug(`Fetching Settlement Initiation data for MatrixId: [${id}].`);

        try {
            if(excelFormat){
                const fetchedBuffer = await this.aggregate.getSettlementInitiationByMatrixIdExport(
                    req.securityContext!,
                    id
                );
                res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                res.setHeader("Content-Disposition", "attachment; filename=settlementInitiation.xlsx");
                res.status(200).send(fetchedBuffer);
            }else {
                const fetchedJson = await this.aggregate.getSettlementInitiationByMatrixId(
                    req.securityContext!,
                    id
                );
                res.send(fetchedJson);
            }
        } catch (err: any) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message,
            });
        }
    }

    private async getDFSPSettlementDetail(req: express.Request, res: express.Response): Promise<void> {
        const participantId = req.query.participantId as string || req.query.participantId as string;
		const matrixId = req.query.matrixId as string || req.query.matrixid as string;

        this.logger.debug(`Fetching DFSP Settlement Detail data for ParticipantId: ${participantId} and MatrixId: ${matrixId}.`);

        try {
            if(!participantId || !matrixId){
                throw new Error("Invalid input parameters.");
            }
            const fetched = await this.aggregate.getDFSPSettlementDetail(
                req.securityContext!,
                participantId,
                matrixId
            );
            res.send(fetched);
        } catch (err: any) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message,
            });
        }
    }

    private async getDFSPSettlement(req: express.Request, res: express.Response): Promise<void> {
        const participantId = req.query.participantId as string || req.query.participantId as string;
		const matrixId = req.query.matrixId as string || req.query.matrixid as string;
        const excelFormat = req.query.format && (req.query.format as string).toUpperCase() === "EXCEL" ? true : false;

        this.logger.debug(`Fetching DFSP Settlement data for ParticipantId: ${participantId} and MatrixId: ${matrixId}.`);

        try {
            if(!participantId || !matrixId){
                throw new Error("Invalid input parameters.");
            }else{

                if(excelFormat){
                    const fetchedBuffer = await this.aggregate.getDFSPSettlementExport(
                        req.securityContext!,
                        participantId,
                        matrixId
                    );
                    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    res.setHeader("Content-Disposition", "attachment; filename=DFSPSettlementReport.xlsx");
                    res.status(200).send(fetchedBuffer);
                }else {
                    const fetchedJson = await this.aggregate.getDFSPSettlement(
                        req.securityContext!,
                        participantId,
                        matrixId
                    );
                    res.send(fetchedJson);
                }

            }
        } catch (err: any) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message,
            });
        }
    }

    private async getSettlementMatrixIds(req: express.Request, res: express.Response): Promise<void> {
        try{
            const participantId = req.query.participantId as string;
            const startDateStr = req.query.startDate as string || req.query.startdate as string;
            const startDate = startDateStr ? parseInt(startDateStr) : undefined;
            const endDateStr = req.query.endDate as string || req.query.enddate as string;
            const endDate = endDateStr ? parseInt(endDateStr) : undefined;

            this.logger.debug("Fetching all matrixIds");

            let fetched = [];
            if (participantId && startDate && endDate) {
                fetched = await this.aggregate.getSettlementMatricesByDfspNameAndFromDateToDate(req.securityContext!,participantId, startDate, endDate);
            } else {
                //will put other scenario later
            }
            res.send(fetched);
        } catch (err: any) {
            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: err.message,
            });
        }
    }

}
