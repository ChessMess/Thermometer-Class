# Thermometer Class

A javascript temperature monitoring class that supports custom thresholds with directional and tolerance controls.
Uses the open-meteo API to fetch temperature data, see https://open-meteo.com/ for more information.

## Features

- Temperature readings in both Celsius and Fahrenheit
- Custom temperature thresholds with callbacks
- Directional threshold monitoring (increasing/decreasing/both)
- Configurable tolerance ranges to prevent multiple triggers
- Fetch temperature from open-meteo API

## Usage

```
const thermometer = new Thermometer();
// Set temperature (in Celsius)
thermometer.setTemperature(25);

// Get temperature readings
console.log(thermometer.getCelsius()); // 25
console.log(thermometer.getFahrenheit()); // 77

// Fetch temperature from API (https://open-meteo.com/)
await thermometer.fetchTemperature(url); 
```

### Thresholds

Note: Only thresholds that are triggered regardless of direction will trigger on the initial temperature setting.

```
// Create a simple threshold at freezing point
const freezingId = thermometer.addThreshold({
temp: 0,
callback: (data) => {
    console.log(Temperature reached ${data.temperature}°C);
    console.log(Direction: ${data.direction});
  }
});

// Create a threshold that only triggers when temperature is decreasing
const frostAlertId = thermometer.addThreshold({
  temp: 2,
  callback: (data) => console.log('Frost warning!'),
  direction: 'decreasing'
});

// Create a threshold with custom tolerance
const boilingId = thermometer.addThreshold({
  temp: 100,
  callback: (data) => console.log('Water is boiling!'),
  tolerance: 1.0 // ±1°C tolerance
});

// Remove a threshold when no longer needed
thermometer.removeThreshold(freezingId);
```
