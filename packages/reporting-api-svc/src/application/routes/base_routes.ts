/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 * Gonçalo Garcia <goncalogarcia99@gmail.com>

 * Arg Software
 - José Antunes <jose.antunes@arg.software>
 - Rui Rocha <rui.rocha@arg.software>

 --------------
 **/

"use strict";

import { CallSecurityContext, ForbiddenError, IAuthorizationClient, UnauthorizedError } from "@mojaloop/security-bc-public-types-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { TokenHelper } from "@mojaloop/security-bc-client-lib";
import express from "express";
import { validationResult } from "express-validator";
import { IReportingRepo } from "../../types";
import { ReportingAggregate } from "../../domain/aggregate";


declare module "express-serve-static-core" {
    export interface Request {
        securityContext: null | CallSecurityContext;
    }
}


export abstract class BaseRoutes {
    private readonly _mainRouter: express.Router;
    private readonly _logger: ILogger;
    private readonly _reportingRepo: IReportingRepo;
    private readonly _tokenHelper: TokenHelper;
    private readonly _authorizationClient: IAuthorizationClient;
    private readonly _aggregate: ReportingAggregate;

    constructor(
        logger: ILogger,
        reportingRepo: IReportingRepo,
        tokenHelper: TokenHelper,
        authorizationClient:IAuthorizationClient,
        aggregate: ReportingAggregate,
    ) {
        this._mainRouter = express.Router();
        this._logger = logger;
        this._reportingRepo = reportingRepo;
        this._tokenHelper = tokenHelper;
        this._authorizationClient = authorizationClient;
        this._aggregate = aggregate;

        // inject authentication - all requests require a valid token
        this._mainRouter.use(this._authenticationMiddleware.bind(this));
    }

    get logger(): ILogger {
        return this._logger;
    }

    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    get transfersRepo(): IReportingRepo {
        return this._reportingRepo;
    }

    get aggregate(): ReportingAggregate {
        return this._aggregate;
    }

    private async _authenticationMiddleware(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) {
        const authorizationHeader = req.headers["authorization"];

        if (!authorizationHeader)
        {
            return res.sendStatus(401);
        }

        const bearer = authorizationHeader.trim().split(" ");
        if (bearer.length != 2) {
            return res.sendStatus(401);
        }

        const bearerToken = bearer[1];
        let verified;
        try {
            verified = await this._tokenHelper.verifyToken(bearerToken);
        } catch (err) {
            this._logger.error(err, "unable to verify token");
            return res.sendStatus(401);
        }
        if (!verified) {
            return res.sendStatus(401);
        }

        const decoded = this._tokenHelper.decodeToken(bearerToken);
        if (!decoded.sub || decoded.sub.indexOf("::") == -1) {
            return res.sendStatus(401);
        }

        const subSplit = decoded.sub.split("::");
        const subjectType = subSplit[0];
        const subject = subSplit[1];

        req.securityContext = {
            accessToken: bearerToken,
            clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null,
            username: subjectType.toUpperCase().startsWith("USER") ? subject : null,
            rolesIds: decoded.roles,
        };

        return next();
    }

    protected handleUnauthorizedError(err: Error, res: express.Response): boolean {
        if (err instanceof UnauthorizedError) {
            this._logger.warn(err.message);
            res.status(401).json({
                status: "error",
                msg: err.message,
            });
            return true;
        } else if (err instanceof ForbiddenError) {
            this._logger.warn(err.message);
            res.status(403).json({
                status: "error",
                msg: err.message,
            });
            return true;
        }

        return false;
    }

    protected _enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
        for (const roleId of secCtx.rolesIds) {
            if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
                return;
            }
        }
        const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
        this._logger.isWarnEnabled() && this._logger.warn(error.message);
        throw error;
    }

    public validateRequest(req: express.Request, res: express.Response) : boolean {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.array() });
            return false;
        }
        return true;
    }
}