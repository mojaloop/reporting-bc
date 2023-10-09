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

 import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
 import {IMessage,IMessageConsumer} from "@mojaloop/platform-shared-lib-messaging-types-lib";
 import {SettlementsBCTopics, ParticipantsBCTopics} from "@mojaloop/platform-shared-lib-public-messages-lib";
 import {ParticipantChangedEvt} from "@mojaloop/platform-shared-lib-public-messages-lib";

 export class ParticipantsReportingEventHandler{
    private readonly _logger:ILogger;
    private readonly _consumer:IMessageConsumer;

    constructor(consumer:IMessageConsumer, logger:ILogger) {
        this._logger = logger.createChild(this.constructor.name);
        this._consumer = consumer;
    }

    async start():Promise<void>{
        this._consumer.setTopics([ParticipantsBCTopics.DomainEvents]);
        this._consumer.setCallbackFn(this._msgHandler.bind(this));
        await this._consumer.connect();
        await this._consumer.startAndWaitForRebalance();

        this._logger.info("ParticipantsReportingEventHandler started.");
    }

    async stop():Promise<void>{
        await this._consumer.stop();
    }

    private async _msgHandler(message: IMessage): Promise<void>{
        // eslint-disable-next-line no-async-promise-executor
        return await new Promise<void>(async (resolve) => {
            this._logger.debug(`Got message in ParticipantsEventHandler with name: ${message.msgName}`);
            try {

                if(message.msgName === ParticipantChangedEvt.name){
                    await this.handleParticipantChangedEvt(message as ParticipantChangedEvt);

                }else{
                    // ignore message, don't bother logging
                }

            }catch(err: unknown){
                this._logger.error(err, `ParticipantsEventHandler - processing command - ${message?.msgName}:${message?.msgKey}:${message?.msgId} - Error: ${(err as Error)?.message?.toString()}`);
            }finally {
                resolve();
            }
        });
    }
    
    private async handleParticipantChangedEvt(event:ParticipantChangedEvt):Promise<void>{
        // TODO update the reporting db with the state of this prepared transfer (create it)

    }
}