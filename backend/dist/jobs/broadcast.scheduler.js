"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastScheduler = void 0;
const tsyringe_1 = require("tsyringe");
const broadcast_queue_1 = require("./broadcast.queue");
const logger_config_1 = require("../config/logger.config");
/**
 * Default interval for checking scheduled broadcasts (60 seconds).
 */
const DEFAULT_INTERVAL_MS = 60000;
/**
 * Service for periodically checking and processing scheduled broadcasts.
 *
 * Runs a timer that checks for broadcasts whose scheduled time has passed
 * and enqueues them for processing.
 */
let BroadcastScheduler = class BroadcastScheduler {
    broadcastQueue;
    intervalId = null;
    constructor(broadcastQueue) {
        this.broadcastQueue = broadcastQueue;
    }
    /**
     * Start the scheduler.
     *
     * Begins periodically checking for scheduled broadcasts that are ready to send.
     *
     * @param intervalMs - Check interval in milliseconds (default: 60000)
     */
    start(intervalMs = DEFAULT_INTERVAL_MS) {
        if (this.intervalId !== null) {
            logger_config_1.logger.warn('Scheduler already running, ignoring start request');
            return;
        }
        logger_config_1.logger.info('Starting broadcast scheduler', { intervalMs });
        this.intervalId = setInterval(async () => {
            try {
                await this.broadcastQueue.checkScheduledBroadcasts();
            }
            catch (error) {
                logger_config_1.logger.error('Error checking scheduled broadcasts', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });
            }
        }, intervalMs);
    }
    /**
     * Stop the scheduler.
     *
     * Stops checking for scheduled broadcasts.
     */
    stop() {
        if (this.intervalId === null) {
            return;
        }
        clearInterval(this.intervalId);
        this.intervalId = null;
        logger_config_1.logger.info('Broadcast scheduler stopped');
    }
    /**
     * Check if the scheduler is running.
     *
     * @returns True if the scheduler is active
     */
    isRunning() {
        return this.intervalId !== null;
    }
};
exports.BroadcastScheduler = BroadcastScheduler;
exports.BroadcastScheduler = BroadcastScheduler = __decorate([
    (0, tsyringe_1.singleton)(),
    __param(0, (0, tsyringe_1.inject)(broadcast_queue_1.BroadcastQueue)),
    __metadata("design:paramtypes", [broadcast_queue_1.BroadcastQueue])
], BroadcastScheduler);
