"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var Direction;
(function (Direction) {
    Direction["INCREASING"] = "increasing";
    Direction["DECREASING"] = "decreasing";
    Direction["BOTH"] = "both";
})(Direction || (Direction = {}));
class Thermometer {
    constructor() {
        this.currentTemp = 0; // in Celsius
        this.previousTemp = 0;
        this.initialized = false; // prevents checkThresholds from running before temperature is set
        this.thresholds = new Map(); // Map to store thresholds and their callbacks
        this.defaultTolerance = 0.5; // Default ±0.5°C tolerance
    }
    // Set temperature and check thresholds
    setTemperature(celsius) {
        if (isNaN(celsius)) {
            throw new Error('Temperature must be a number');
        }
        this.previousTemp = this.currentTemp;
        this.currentTemp = celsius;
        this.checkThresholds();
        this.initialized = true;
    }
    // Get temperature in Celsius
    getCelsius() {
        if (!this.initialized) {
            throw new Error('Temperature has not been set');
        }
        return this.currentTemp;
    }
    // Get temperature in Fahrenheit
    getFahrenheit() {
        if (!this.initialized) {
            throw new Error('Temperature has not been set');
        }
        return (this.currentTemp * 9 / 5) + 32;
    }
    // Add a threshold with callback and direction option
    addThreshold({ temp, callback, direction = Direction.BOTH, tolerance = this.defaultTolerance }) {
        const id = Symbol();
        this.thresholds.set(id, {
            temp,
            callback,
            direction,
            tolerance,
            lastTriggered: false
        });
        return id;
    }
    // Remove a threshold
    removeThreshold(id) {
        return this.thresholds.delete(id);
    }
    // Check all thresholds and trigger callbacks if necessary
    checkThresholds() {
        for (const [id, threshold] of this.thresholds) {
            const { temp: thresholdTriggerTemp, callback, direction, tolerance, lastTriggered } = threshold;
            // If the thermometer is not initialized, only check thresholds with direction 'both'
            // since there is no previous temperature to compare to yet to determine direction
            if (!this.initialized && direction !== Direction.BOTH) {
                continue;
            }
            const lowerToleranceTemp = thresholdTriggerTemp - tolerance;
            const upperToleranceTemp = thresholdTriggerTemp + tolerance;
            const isWithinTriggerTempRange = ((this.currentTemp >= lowerToleranceTemp) &&
                (this.currentTemp <= upperToleranceTemp));
            const isIncreasing = this.initialized && this.currentTemp > this.previousTemp;
            const isDecreasing = this.initialized && this.currentTemp < this.previousTemp;
            const isMatchingDirection = (direction === Direction.INCREASING && isIncreasing) ||
                (direction === Direction.DECREASING && isDecreasing) ||
                (direction === Direction.BOTH);
            if (isWithinTriggerTempRange && isMatchingDirection && !lastTriggered) {
                callback({
                    temperature: this.currentTemp,
                    threshold: thresholdTriggerTemp,
                    direction: isIncreasing ? Direction.INCREASING : isDecreasing ? Direction.DECREASING : Direction.BOTH,
                });
                threshold.lastTriggered = true;
            }
            else if (!isWithinTriggerTempRange) {
                threshold.lastTriggered = false;
            }
        }
    }
    fetchTemperature(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = yield response.json();
                // Assumes the open-meteo API which returns temperature in a 'temperature_2m' field
                const temperature = Number(data.current.temperature_2m);
                if (isNaN(temperature)) {
                    throw new Error('Invalid temperature value fetched');
                }
                this.setTemperature(temperature);
            }
            catch (error) {
                throw new Error(`Failed to fetch temperature: ${error.message}`);
            }
        });
    }
}
exports.default = Thermometer;
