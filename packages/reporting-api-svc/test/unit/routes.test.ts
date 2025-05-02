import request from 'supertest';
import express from 'express';
import { ExpressRoutes } from '../../src/application/routes/routes';
import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import { TokenHelper } from '@mojaloop/security-bc-client-lib';
import { IAuthorizationClient, CallSecurityContext } from '@mojaloop/security-bc-public-types-lib';
import { IReportingRepo } from '../../src/types';
import { ReportingAggregate } from '../../src/domain/aggregate';

jest.mock('../../src/domain/aggregate');

describe('ExpressRoutes', () => {
    let app: express.Express;
    let mockLogger: ILogger;
    let mockTokenHelper: jest.Mocked<TokenHelper>;
    let mockAuthorizationClient: jest.Mocked<IAuthorizationClient>;
    let mockReportingRepo: jest.Mocked<IReportingRepo>;
    let mockAggregate: jest.Mocked<ReportingAggregate>;
    let securityContext: CallSecurityContext;

    beforeAll(() => {
        // Initialize Express app
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Mock Logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn(),
            isInfoEnabled: jest.fn().mockReturnValue(true),
            isDebugEnabled: jest.fn().mockReturnValue(true),
            isErrorEnabled: jest.fn().mockReturnValue(true),
            isWarnEnabled: jest.fn().mockReturnValue(true),
            isTraceEnabled: jest.fn().mockReturnValue(true),
            isFatalEnabled: jest.fn().mockReturnValue(true),
            createChild: jest.fn().mockReturnThis(),
        } as unknown as ILogger;

        // Mock TokenHelper
        mockTokenHelper = {
            init: jest.fn(),
            destroy: jest.fn(),
            getCallSecurityContextFromAccessToken: jest.fn(),
        } as unknown as jest.Mocked<TokenHelper>;

        // Mock AuthorizationClient
        mockAuthorizationClient = {
            init: jest.fn(),
            destroy: jest.fn(),
            roleHasPrivilege: jest.fn(),
            getAllPrivilegesForRole: jest.fn(),
            addPrivilegesArray: jest.fn(),
            fetch: jest.fn(),
            bootstrap: jest.fn(),
        } as unknown as jest.Mocked<IAuthorizationClient>;

        // Mock ReportingRepo
        mockReportingRepo = {
            init: jest.fn(),
            destroy: jest.fn(),
            // Add other methods if needed
        } as unknown as jest.Mocked<IReportingRepo>;

        // Mock ReportingAggregate
        mockAggregate = {
            getSettlementInitiationByMatrixId: jest.fn(),
            getSettlementInitiationByMatrixIdExport: jest.fn(),
            getDFSPSettlementDetail: jest.fn(),
            getDFSPSettlementDetailExport: jest.fn(),
            getDFSPSettlement: jest.fn(),
            getDFSPSettlementExport: jest.fn(),
            getDFSPSettlementStatement: jest.fn(),
            getDFSPSettlementStatementExport: jest.fn(),
            getSettlementMatricesByDfspNameAndFromDateToDate: jest.fn(),
        } as unknown as jest.Mocked<ReportingAggregate>;

        // Setup security context
        securityContext = {
            username: 'testuser',
            clientId: 'testclientid',
            platformRoleIds: ['platformRole1'],
            accessToken: 'testaccesstoken',
            participantRoleIds: [
                {
                    participantId: 'participant1',
                    roleId: 'role1',
                },
            ],
        };

        // Mock TokenHelper to return security context
        mockTokenHelper.getCallSecurityContextFromAccessToken.mockResolvedValue(securityContext);

        // Initialize routes
        const routes = new ExpressRoutes(
            mockLogger,
            mockTokenHelper,
            mockAuthorizationClient,
            mockReportingRepo,
            mockAggregate,
        );

        app.use('/', routes.mainRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /settlementMatrixIds', () => {
        it('should return settlement matrix IDs', async () => {
            // Arrange
            const participantId = 'participant1';
            const startDate = 1609459200000; // Jan 1, 2021
            const endDate = 1612137600000; // Feb 1, 2021
            const mockResponse = ['matrix1', 'matrix2'];

            mockAggregate.getSettlementMatricesByDfspNameAndFromDateToDate.mockResolvedValue(mockResponse);

            // Act
            const res = await request(app)
                .get('/settlementMatrixIds')
                .set('Authorization', 'Bearer token')
                .query({ participantId, startDate, endDate });

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResponse);
            expect(mockAggregate.getSettlementMatricesByDfspNameAndFromDateToDate).toHaveBeenCalledWith(
                securityContext,
                participantId,
                startDate,
                endDate,
            );
        });

        it('should handle errors', async () => {
            // Arrange
            const error = new Error('Test error');
            mockAggregate.getSettlementMatricesByDfspNameAndFromDateToDate.mockRejectedValue(error);

            // Act
            const res = await request(app)
                .get('/settlementMatrixIds')
                .set('Authorization', 'Bearer token')
                .query({ participantId: 'participant1', startDate: '1609459200000', endDate: '1612137600000' });

            // Assert
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ status: 'error', msg: error.message });
            expect(mockLogger.error).toHaveBeenCalledWith(error);
        });
    });

    describe('GET /settlementInitiationByMatrixId/:id', () => {
        it('should return settlement initiation data in JSON format', async () => {
            // Arrange
            const id = 'matrix1';
            const mockResponse = { data: 'some data' };

            mockAggregate.getSettlementInitiationByMatrixId.mockResolvedValue(mockResponse);

            // Act
            const res = await request(app)
                .get(`/settlementInitiationByMatrixId/${id}`)
                .set('Authorization', 'Bearer token');

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResponse);
            expect(mockAggregate.getSettlementInitiationByMatrixId).toHaveBeenCalledWith(securityContext, id);
        });
        it('should return settlement initiation data in Excel format', async () => {
            // Arrange
            const id = 'matrix1';
            const mockBuffer = Buffer.from('excel data');

            mockAggregate.getSettlementInitiationByMatrixIdExport.mockResolvedValue(mockBuffer);

            // Act
            const res = await request(app)
                .get(`/settlementInitiationByMatrixId/${id}`)
                .set('Authorization', 'Bearer token')
                .query({ format: 'excel' })
                .buffer() // Ensure that the response is buffered
                .parse((res, callback) => {
                    const data: Buffer[] = [];
                    res.on('data', (chunk) => data.push(Buffer.from(chunk)));
                    res.on('end', () => callback(null, Buffer.concat(data)));
                });

            // Assert
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(res.headers['content-disposition']).toBe('attachment; filename=settlementInitiation.xlsx');

            expect(res.body).toEqual(mockBuffer);
            expect(mockAggregate.getSettlementInitiationByMatrixIdExport).toHaveBeenCalledWith(
                securityContext,
                id,
                undefined,
            );
        });
        it('should handle errors', async () => {
            // Arrange
            const id = 'matrix1';
            const error = new Error('Test error');
            mockAggregate.getSettlementInitiationByMatrixId.mockRejectedValue(error);

            // Act
            const res = await request(app)
                .get(`/settlementInitiationByMatrixId/${id}`)
                .set('Authorization', 'Bearer token');

            // Assert
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ status: 'error', msg: error.message });
            expect(mockLogger.error).toHaveBeenCalledWith(error);
        });
    });

    describe('GET /dfspSettlementDetail', () => {
        it('should return DFSP settlement detail in JSON format', async () => {
            // Arrange
            const participantId = 'participant1';
            const matrixId = 'matrix1';
            const mockResponse = { data: 'detail data' };

            mockAggregate.getDFSPSettlementDetail.mockResolvedValue(mockResponse);

            // Act
            const res = await request(app)
                .get('/dfspSettlementDetail')
                .set('Authorization', 'Bearer token')
                .query({ participantId, matrixId });

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResponse);
            expect(mockAggregate.getDFSPSettlementDetail).toHaveBeenCalledWith(
                securityContext,
                participantId,
                matrixId,
            );
        });

        it('should return DFSP settlement detail in Excel format', async () => {
            // Arrange
            const participantId = 'participant1';
            const matrixId = 'matrix1';
            const mockBuffer = Buffer.from('excel data');

            mockAggregate.getDFSPSettlementDetailExport.mockResolvedValue(mockBuffer);

            // Act
            const res = await request(app)
                .get('/dfspSettlementDetail')
                .set('Authorization', 'Bearer token')
                .query({ participantId, matrixId, format: 'excel' })
                .buffer()
                .parse((res, callback) => {
                    const data: Buffer[] = [];
                    res.on('data', (chunk) => data.push(Buffer.from(chunk)));
                    res.on('end', () => callback(null, Buffer.concat(data)));
                });

            // Assert
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(res.headers['content-disposition']).toBe('attachment; filename=DFSPSettlementDetailReport.xlsx');
            expect(res.body).toEqual(mockBuffer);
            expect(mockAggregate.getDFSPSettlementDetailExport).toHaveBeenCalledWith(
                securityContext,
                participantId,
                matrixId,
                undefined,
            );
        });

        it('should handle missing parameters', async () => {
            // Act
            const res = await request(app)
                .get('/dfspSettlementDetail')
                .set('Authorization', 'Bearer token');

            // Assert
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ status: 'error', msg: 'Invalid input parameters.' });
            expect(mockLogger.error).toHaveBeenCalledWith(new Error('Invalid input parameters.'));
        });
    });

    describe('GET /dfspSettlement', () => {
        it('should return DFSP settlement in JSON format', async () => {
            // Arrange
            const participantId = 'participant1';
            const matrixId = 'matrix1';
            const mockResponse = { data: 'settlement data' };

            mockAggregate.getDFSPSettlement.mockResolvedValue(mockResponse);

            // Act
            const res = await request(app)
                .get('/dfspSettlement')
                .set('Authorization', 'Bearer token')
                .query({ participantId, matrixId });

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResponse);
            expect(mockAggregate.getDFSPSettlement).toHaveBeenCalledWith(
                securityContext,
                participantId,
                matrixId,
            );
        });

        it('should return DFSP settlement in Excel format', async () => {
            // Arrange
            const participantId = 'participant1';
            const matrixId = 'matrix1';
            const mockBuffer = Buffer.from('excel data');

            mockAggregate.getDFSPSettlementExport.mockResolvedValue(mockBuffer);

            // Act
            const res = await request(app)
                .get('/dfspSettlement')
                .set('Authorization', 'Bearer token')
                .query({ participantId, matrixId, format: 'excel' })
                .buffer()
                .parse((res, callback) => {
                    const data: Buffer[] = [];
                    res.on('data', (chunk) => data.push(Buffer.from(chunk)));
                    res.on('end', () => callback(null, Buffer.concat(data)));
                });

            // Assert
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(res.headers['content-disposition']).toBe('attachment; filename=DFSPSettlementReport.xlsx');
            expect(res.body).toEqual(mockBuffer);
            expect(mockAggregate.getDFSPSettlementExport).toHaveBeenCalledWith(
                securityContext,
                participantId,
                matrixId,
                undefined,
            );
        });

        it('should handle missing parameters', async () => {
            // Act
            const res = await request(app)
                .get('/dfspSettlement')
                .set('Authorization', 'Bearer token');

            // Assert
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ status: 'error', msg: 'Invalid input parameters.' });
            expect(mockLogger.error).toHaveBeenCalledWith(new Error('Invalid input parameters.'));
        });
    });

    describe('GET /dfspSettlementStatement', () => {
        it('should return DFSP settlement statement in JSON format', async () => {
            // Arrange
            const participantId = 'participant1';
            const startDate = '1609459200000';
            const endDate = '1612137600000';
            const currencyCode = 'USD';
            const mockResponse = { data: 'statement data' };

            mockAggregate.getDFSPSettlementStatement.mockResolvedValue(mockResponse);

            // Act
            const res = await request(app)
                .get('/dfspSettlementStatement')
                .set('Authorization', 'Bearer token')
                .query({ participantId, startDate, endDate, currencyCode });

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockResponse);
            expect(mockAggregate.getDFSPSettlementStatement).toHaveBeenCalledWith(
                securityContext,
                participantId,
                parseInt(startDate),
                parseInt(endDate),
                currencyCode,
            );
        });

        it('should return DFSP settlement statement in Excel format', async () => {
            // Arrange
            const participantId = 'participant1';
            const startDate = '1609459200000';
            const endDate = '1612137600000';
            const currencyCode = 'USD';
            const mockBuffer = Buffer.from('excel data');

            mockAggregate.getDFSPSettlementStatementExport.mockResolvedValue(mockBuffer);

            // Act
            const res = await request(app)
                .get('/dfspSettlementStatement')
                .set('Authorization', 'Bearer token')
                .query({
                    participantId,
                    startDate,
                    endDate,
                    currencyCode,
                    format: 'excel',
                })
                .buffer()
                .parse((res, callback) => {
                    const data: Buffer[] = [];
                    res.on('data', (chunk) => data.push(Buffer.from(chunk)));
                    res.on('end', () => callback(null, Buffer.concat(data)));
                });

            // Assert
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            expect(res.headers['content-disposition']).toBe('attachment; filename=DFSPSettlementReport.xlsx');
            expect(res.body).toEqual(mockBuffer);
            expect(mockAggregate.getDFSPSettlementStatementExport).toHaveBeenCalledWith(
                securityContext,
                participantId,
                parseInt(startDate),
                parseInt(endDate),
                currencyCode,
                undefined,
            );
        });

        it('should handle missing parameters', async () => {
            // Act
            const res = await request(app)
                .get('/dfspSettlementStatement')
                .set('Authorization', 'Bearer token');

            // Assert
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ status: 'error', msg: 'Invalid input parameters.' });
            expect(mockLogger.error).toHaveBeenCalledWith(new Error('Invalid input parameters.'));
        });
    });

    describe('Authentication and Authorization', () => {
        it('should return 401 if no authorization header is provided', async () => {
            // Act
            const res = await request(app).get('/settlementMatrixIds');

            // Assert
            expect(res.status).toBe(401);
        });

        it('should return 401 if token is invalid', async () => {
            // Arrange
            mockTokenHelper.getCallSecurityContextFromAccessToken.mockResolvedValue(null);

            // Act
            const res = await request(app)
                .get('/settlementMatrixIds')
                .set('Authorization', 'Bearer invalidtoken');

            // Assert
            expect(res.status).toBe(401);
        });
    });
});
