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

    // private _enforcePrivilege(secCtx: CallSecurityContext, privName: string): void {
    //     for (const roleId of secCtx.platformRoleIds) {
    //         if (this._authorizationClient.roleHasPrivilege(roleId, privName)) return;
    //     }
    //     throw new ForbiddenError(
    //         `Required privilege "${privName}" not held by caller`
    //     );
    // }
    
    async getSettlementInitiationByMatrixId(secCtx: CallSecurityContext, id: string): Promise<unknown> {
        // this._enforcePrivilege(secCtx, ParticipantPrivilegeNames.VIEW_PARTICIPANT);

        const result = await this._reportingRepo.getSettlementInitiationByMatrixId(id);
        if (result == null)
            throw new Error(
                `Settlement matrix with ID: '${id}' not found.`
            );
        
        return result;
    }

}