enum Direction {
    INCREASING = 'increasing',
    DECREASING = 'decreasing',
    BOTH = 'both'
}

interface ThresholdCallback {
    temperature: number;
    threshold: number;
    direction: Direction;
}

interface ThresholdConfig {
    temp: number;
    callback: (data: ThresholdCallback) => void;
    direction?: Direction;
    tolerance?: number;
}

interface Threshold {
    temp: number;
    callback: (data: ThresholdCallback) => void;
    direction: Direction;
    tolerance: number;
    lastTriggered: boolean;
}

class Thermometer {
    private currentTemp: number;
    private previousTemp: number;
    private thresholds: Map<Symbol, Threshold>;
    private defaultTolerance: number;
    private initialized: boolean;

    constructor() {
        this.currentTemp = 0; // in Celsius
        this.previousTemp = 0;
        this.initialized = false; // prevents checkThresholds from running before temperature is set
        this.thresholds = new Map(); // Map to store thresholds and their callbacks
        this.defaultTolerance = 0.5; // Default ±0.5°C tolerance
    }

    // Set temperature and check thresholds
    public setTemperature(celsius: number): void {
        if(isNaN(celsius)) {
            throw new Error('Temperature must be a number');
        }

        this.previousTemp = this.currentTemp;
        this.currentTemp = celsius;
        this.checkThresholds();
        this.initialized = true;
    }

    // Get temperature in Celsius
    public getCelsius(): number {
        if (!this.initialized) {
            throw new Error('Temperature has not been set');
        }
        return this.currentTemp;
    }

    // Get temperature in Fahrenheit
    public getFahrenheit(): number {
        if (!this.initialized) {
            throw new Error('Temperature has not been set');
        }
        return (this.currentTemp * 9/5) + 32;
    }

    // Add a threshold with callback and direction option
    public addThreshold({ 
        temp,
        callback, 
        direction = Direction.BOTH,
        tolerance = this.defaultTolerance 
    }: ThresholdConfig): Symbol {
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
    public removeThreshold(id: Symbol): boolean {
        return this.thresholds.delete(id);
    }

    // Check all thresholds and trigger callbacks if necessary
    private checkThresholds(): void {
        for (const [id, threshold] of this.thresholds) {
            const { temp: thresholdTriggerTemp, callback, direction, tolerance, lastTriggered } = threshold;

            // If the thermometer is not initialized, only check thresholds with direction 'both'
            // since there is no previous temperature to compare to yet to determine direction
            if(!this.initialized && direction !== Direction.BOTH) {
                continue;
            }

            const lowerToleranceTemp = thresholdTriggerTemp - tolerance;
            const upperToleranceTemp = thresholdTriggerTemp + tolerance;
            
            const isWithinTriggerTempRange = (
                (this.currentTemp >= lowerToleranceTemp) &&
                (this.currentTemp <= upperToleranceTemp)
            );
            
            const isIncreasing = this.initialized && this.currentTemp > this.previousTemp;
            const isDecreasing = this.initialized && this.currentTemp < this.previousTemp;

            const isMatchingDirection = 
                (direction === Direction.INCREASING && isIncreasing) ||
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

    public async fetchTemperature(url: string): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Assumes the open-meteo API which returns temperature in a 'temperature_2m' field
            const temperature = Number(data.current.temperature_2m);
            
            if (isNaN(temperature)) {
                throw new Error('Invalid temperature value fetched');
            }
            
            this.setTemperature(temperature);
        } catch (error: any) {
            throw new Error(`Failed to fetch temperature: ${error.message}`);
        }
    }
}

export default Thermometer;