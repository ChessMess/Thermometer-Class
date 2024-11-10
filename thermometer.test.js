import Thermometer from "thermometer.js";

describe("Thermometer", () => {
  let thermometer = new Thermometer();

  beforeEach(() => {
    thermometer = new Thermometer();
  });

  describe("temperature conversions", () => {
    test("should initialize at 0°C/32°F", () => {
      thermometer.setTemperature(0);
      expect(thermometer.getCelsius()).toBe(0);
      expect(thermometer.getFahrenheit()).toBe(32);
    });

    test("should correctly convert to Fahrenheit", () => {
      thermometer.setTemperature(100); // boiling point
      expect(thermometer.getFahrenheit()).toBe(212);

      thermometer.setTemperature(-40); // point where C and F scales intersect
      expect(thermometer.getFahrenheit()).toBe(-40);
    });
  });

  describe("threshold management", () => {
    test("should add and remove thresholds", () => {
      const mockCallback = jest.fn();
      const id = thermometer.addThreshold({
        temp: 0,
        callback: mockCallback,
      });

      expect(id).toBeDefined();
      expect(thermometer.removeThreshold(id)).toBe(true);
      expect(thermometer.removeThreshold(id)).toBe(false); // second removal should fail
    });
  });

  describe("threshold callbacks", () => {
    test("should trigger callback when threshold is reached from both directions", () => {
      const freezingCallback = jest.fn();
      thermometer.addThreshold({
        temp: 0,
        callback: freezingCallback,
      });

      // first call - decreasing
      thermometer.setTemperature(1);
      thermometer.setTemperature(0);

      expect(freezingCallback).toHaveBeenCalledTimes(1);
      expect(freezingCallback).toHaveBeenCalledWith({
        temperature: 0,
        threshold: 0,
        direction: "decreasing",
      });

      // second call - increasing
      thermometer.setTemperature(-10);
      thermometer.setTemperature(0);

      expect(freezingCallback).toHaveBeenCalledTimes(2);
      expect(freezingCallback).toHaveBeenCalledWith({
        temperature: 0,
        threshold: 0,
        direction: "increasing",
      });
    });

    test("should trigger callback when tolerance is zero", () => {
      const mockCallback = jest.fn();
      thermometer.addThreshold({
        temp: 10,
        callback: mockCallback,
        tolerance: 0,
      });

      thermometer.setTemperature(10);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        temperature: 10,
        threshold: 10,
        direction: "both",
      });
    });

    test("should respect direction constraints", () => {
      const mockCallback = jest.fn();
      thermometer.addThreshold({
        temp: 0,
        callback: mockCallback,
        direction: "decreasing",
      });

      // Should not trigger (increasing)
      thermometer.setTemperature(-1);
      thermometer.setTemperature(0);
      expect(mockCallback).not.toHaveBeenCalled();

      // Should trigger (decreasing)
      thermometer.setTemperature(1);
      thermometer.setTemperature(0);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test("should respect tolerance and not trigger multiple times within tolerance range", () => {
      const mockCallback = jest.fn();
      thermometer.addThreshold({
        temp: 0,
        callback: mockCallback,
        tolerance: 0.5,
      });

      // Simulate temperature fluctuation around 0°C
      const temperatures = [1.5, 1.0, 0.5, 0.0, -0.5, 0.0, -0.5, 0.0, 0.5, 0.0];
      temperatures.forEach((temp) => thermometer.setTemperature(temp));

      // Should trigger once despite multiple crossings within tolerance
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test("should reset trigger state when moving outside tolerance range", () => {
      const mockCallback = jest.fn();
      thermometer.addThreshold({
        temp: 0,
        callback: mockCallback,
        tolerance: 0.5,
      });

      // First approach to threshold
      thermometer.setTemperature(1.0);
      thermometer.setTemperature(0.0);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Move well outside tolerance
      thermometer.setTemperature(2.0);

      // Second approach to threshold
      thermometer.setTemperature(0.0);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("multiple thresholds", () => {
    test("should handle multiple thresholds independent of direction", () => {
      const freezingCallback = jest.fn(() => {});
      const boilingCallback = jest.fn(() => {});
      thermometer.setTemperature(10);

      thermometer.addThreshold({
        temp: 0,
        callback: freezingCallback,
        tolerance: 1,
      });

      thermometer.addThreshold({
        temp: 100,
        callback: boilingCallback,
        tolerance: 1,
      });

      thermometer.setTemperature(-50);
      thermometer.setTemperature(0); // Should trigger freezing
      thermometer.setTemperature(100); // Should trigger boiling
      thermometer.setTemperature(50);
      thermometer.setTemperature(100); // Should trigger boiling
      thermometer.setTemperature(0); // Should trigger freezing

      expect(freezingCallback).toHaveBeenCalledTimes(2);
      expect(boilingCallback).toHaveBeenCalledTimes(2);
    });

    test("should not trigger multiple times within tolerance range", () => {
      const freezingCallback = jest.fn(() => {});
      const boilingCallback = jest.fn(() => {});
      thermometer.setTemperature(10);

      thermometer.addThreshold({
        temp: 0,
        callback: freezingCallback,
        tolerance: 1,
      });

      thermometer.addThreshold({
        temp: 100,
        callback: boilingCallback,
        tolerance: 1,
      });

      thermometer.setTemperature(0); // Should trigger freezing
      thermometer.setTemperature(-1); // should not retrigger freezing
      thermometer.setTemperature(0);// should not retrigger freezing
      thermometer.setTemperature(100); // Should trigger boiling
      thermometer.setTemperature(101); // should not retrigger boiling
      thermometer.setTemperature(100);

      expect(freezingCallback).toHaveBeenCalledTimes(1);
      expect(boilingCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchTemperature', () => {
    beforeEach(() => {
        // Reset fetch mock before each test
        global.fetch = jest.fn();
    });
    const mockTemp = 23.5;
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=47.5835702&longitude=-122.136270&current=temperature_2m';

    test('successfully fetches and sets temperature', async () => {

        (global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ current: { temperature_2m: mockTemp } })
        });

        const thermometer = new Thermometer();
        await thermometer.fetchTemperature(url);

        expect(global.fetch).toHaveBeenCalledWith(url);
        expect(thermometer.getCelsius()).toBe(mockTemp);
    });

    test('throws error on failed fetch', async () => {
        (global.fetch).mockRejectedValueOnce(new Error('Network error'));

        const thermometer = new Thermometer();
        await expect(thermometer.fetchTemperature(url))
            .rejects
            .toThrow('Failed to fetch temperature: Network error');
    });

    test('throws error on invalid temperature data', async () => {
        (global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ current: { temperature_2m: 'not a number' } })
        });

        const thermometer = new Thermometer();
        await expect(thermometer.fetchTemperature(url))
            .rejects
            .toThrow('Failed to fetch temperature: Invalid temperature value fetched');
    });
  });
});
