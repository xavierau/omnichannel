"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const broadcast_report_presenter_1 = require("../broadcast-report.presenter");
const enums_1 = require("../enums");
const enums_2 = require("../../templates/enums");
describe('toBroadcastReportResponse', () => {
    const mockTemplateVariables = {
        header: undefined,
        bodyVariables: [
            { index: 0, sourceType: 'static', staticValue: 'Hello' },
        ],
        buttonVariables: [],
    };
    const createMockBroadcast = (overrides = {}) => ({
        id: 'broadcast-1',
        tenantId: 'tenant-123',
        name: 'Test Broadcast',
        description: 'Test description',
        templateId: 'template-1',
        templateName: 'Welcome Template',
        templateCategory: enums_2.TemplateCategory.MARKETING,
        templateLanguage: 'en',
        recipientType: enums_1.RecipientType.GROUP,
        groupId: 'group-1',
        customerIds: null,
        totalRecipients: 100,
        templateVariables: mockTemplateVariables,
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        isImmediate: false,
        timezone: 'UTC',
        status: enums_1.BroadcastStatus.COMPLETED,
        sentCount: 100,
        deliveredCount: 95,
        readCount: 60,
        failedCount: 5,
        createdBy: 'user-123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T11:00:00Z'),
        previousStatus: null,
        customFields: {},
        channelAccountId: null,
        channelAccount: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: null,
        template: null,
        group: null,
        creator: null,
        ...overrides,
    });
    describe('Basic fields', () => {
        it('should include basic broadcast information', () => {
            const broadcast = createMockBroadcast();
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.id).toBe('broadcast-1');
            expect(report.name).toBe('Test Broadcast');
            expect(report.status).toBe(enums_1.BroadcastStatus.COMPLETED);
            expect(report.templateName).toBe('Welcome Template');
            expect(report.totalRecipients).toBe(100);
        });
        it('should include timing information', () => {
            const broadcast = createMockBroadcast();
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.scheduledAt).toEqual(new Date('2024-01-15T10:00:00Z'));
            expect(report.startedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
            expect(report.completedAt).toEqual(new Date('2024-01-15T11:00:00Z'));
        });
    });
    describe('Metrics', () => {
        it('should include raw metric counts', () => {
            const broadcast = createMockBroadcast({
                sentCount: 100,
                deliveredCount: 95,
                readCount: 60,
                failedCount: 5,
                totalRecipients: 100,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.metrics.sent).toBe(100);
            expect(report.metrics.delivered).toBe(95);
            expect(report.metrics.read).toBe(60);
            expect(report.metrics.failed).toBe(5);
        });
        it('should calculate pending count correctly', () => {
            const broadcast = createMockBroadcast({
                sentCount: 70,
                totalRecipients: 100,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.metrics.pending).toBe(30);
        });
        it('should not allow negative pending count', () => {
            const broadcast = createMockBroadcast({
                sentCount: 110, // Edge case: more sent than total
                totalRecipients: 100,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.metrics.pending).toBe(0);
        });
        it('should handle zero total recipients', () => {
            const broadcast = createMockBroadcast({
                sentCount: 0,
                totalRecipients: 0,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.metrics.pending).toBe(0);
        });
    });
    describe('Rates', () => {
        it('should calculate delivery rate correctly', () => {
            const broadcast = createMockBroadcast({
                sentCount: 100,
                deliveredCount: 95,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.rates.deliveryRate).toBe(95);
        });
        it('should calculate read rate correctly', () => {
            const broadcast = createMockBroadcast({
                deliveredCount: 95,
                readCount: 60,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            // 60 / 95 * 100 = 63.157...
            expect(report.rates.readRate).toBeCloseTo(63.16, 2);
        });
        it('should calculate failure rate correctly', () => {
            const broadcast = createMockBroadcast({
                sentCount: 100,
                failedCount: 5,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.rates.failureRate).toBe(5);
        });
        it('should return 0% delivery rate when no messages sent', () => {
            const broadcast = createMockBroadcast({
                sentCount: 0,
                deliveredCount: 0,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.rates.deliveryRate).toBe(0);
        });
        it('should return 0% read rate when no messages delivered', () => {
            const broadcast = createMockBroadcast({
                deliveredCount: 0,
                readCount: 0,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.rates.readRate).toBe(0);
        });
        it('should return 0% failure rate when no messages sent', () => {
            const broadcast = createMockBroadcast({
                sentCount: 0,
                failedCount: 0,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.rates.failureRate).toBe(0);
        });
        it('should handle 100% delivery rate', () => {
            const broadcast = createMockBroadcast({
                sentCount: 100,
                deliveredCount: 100,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.rates.deliveryRate).toBe(100);
        });
        it('should round rates to 2 decimal places', () => {
            const broadcast = createMockBroadcast({
                sentCount: 300,
                deliveredCount: 200,
                readCount: 67,
                failedCount: 33,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            // 200/300 = 66.666... -> 66.67
            expect(report.rates.deliveryRate).toBe(66.67);
            // 67/200 = 33.5 -> 33.5
            expect(report.rates.readRate).toBe(33.5);
            // 33/300 = 11 -> 11
            expect(report.rates.failureRate).toBe(11);
        });
    });
    describe('Duration', () => {
        it('should calculate duration in seconds', () => {
            const broadcast = createMockBroadcast({
                startedAt: new Date('2024-01-15T10:00:00Z'),
                completedAt: new Date('2024-01-15T11:00:00Z'),
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            // 1 hour = 3600 seconds
            expect(report.duration).toBe(3600);
        });
        it('should return null duration when startedAt is null', () => {
            const broadcast = createMockBroadcast({
                startedAt: null,
                completedAt: new Date('2024-01-15T11:00:00Z'),
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.duration).toBeNull();
        });
        it('should return null duration when completedAt is null', () => {
            const broadcast = createMockBroadcast({
                startedAt: new Date('2024-01-15T10:00:00Z'),
                completedAt: null,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.duration).toBeNull();
        });
        it('should return null duration when both dates are null', () => {
            const broadcast = createMockBroadcast({
                startedAt: null,
                completedAt: null,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.duration).toBeNull();
        });
        it('should handle short durations', () => {
            const broadcast = createMockBroadcast({
                startedAt: new Date('2024-01-15T10:00:00Z'),
                completedAt: new Date('2024-01-15T10:00:30Z'),
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.duration).toBe(30);
        });
        it('should handle long durations', () => {
            const broadcast = createMockBroadcast({
                startedAt: new Date('2024-01-15T10:00:00Z'),
                completedAt: new Date('2024-01-16T10:00:00Z'),
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            // 24 hours = 86400 seconds
            expect(report.duration).toBe(86400);
        });
    });
    describe('Status-specific behavior', () => {
        it('should handle DRAFT status with no metrics', () => {
            const broadcast = createMockBroadcast({
                status: enums_1.BroadcastStatus.DRAFT,
                sentCount: 0,
                deliveredCount: 0,
                readCount: 0,
                failedCount: 0,
                startedAt: null,
                completedAt: null,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.status).toBe(enums_1.BroadcastStatus.DRAFT);
            expect(report.metrics.pending).toBe(100);
            expect(report.rates.deliveryRate).toBe(0);
            expect(report.duration).toBeNull();
        });
        it('should handle SENDING status with partial metrics', () => {
            const broadcast = createMockBroadcast({
                status: enums_1.BroadcastStatus.SENDING,
                sentCount: 50,
                deliveredCount: 45,
                readCount: 20,
                failedCount: 5,
                startedAt: new Date('2024-01-15T10:00:00Z'),
                completedAt: null,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.status).toBe(enums_1.BroadcastStatus.SENDING);
            expect(report.metrics.pending).toBe(50);
            expect(report.rates.deliveryRate).toBe(90);
            expect(report.duration).toBeNull();
        });
        it('should handle FAILED status', () => {
            const broadcast = createMockBroadcast({
                status: enums_1.BroadcastStatus.FAILED,
                sentCount: 100,
                deliveredCount: 30,
                readCount: 10,
                failedCount: 70,
                startedAt: new Date('2024-01-15T10:00:00Z'),
                completedAt: new Date('2024-01-15T10:30:00Z'),
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.status).toBe(enums_1.BroadcastStatus.FAILED);
            expect(report.rates.failureRate).toBe(70);
            expect(report.duration).toBe(1800);
        });
        it('should handle CANCELLED status', () => {
            const broadcast = createMockBroadcast({
                status: enums_1.BroadcastStatus.CANCELLED,
                sentCount: 0,
                deliveredCount: 0,
                readCount: 0,
                failedCount: 0,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.status).toBe(enums_1.BroadcastStatus.CANCELLED);
        });
        it('should handle PAUSED status', () => {
            const broadcast = createMockBroadcast({
                status: enums_1.BroadcastStatus.PAUSED,
                sentCount: 30,
                deliveredCount: 28,
                readCount: 15,
                failedCount: 2,
            });
            const report = (0, broadcast_report_presenter_1.toBroadcastReportResponse)(broadcast);
            expect(report.status).toBe(enums_1.BroadcastStatus.PAUSED);
            expect(report.metrics.pending).toBe(70);
        });
    });
});
