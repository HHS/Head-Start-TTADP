const { getEnvNumber } = require('./envParser');

describe('envParser', () => {
  describe('getEnvNumber', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return the default value when env var is not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnvNumber('TEST_VAR', 42)).toBe(42);
    });

    it('should return the default value when env var is empty string', () => {
      process.env.TEST_VAR = '';
      expect(getEnvNumber('TEST_VAR', 42)).toBe(42);
    });

    it('should return the parsed number when env var is a valid number', () => {
      process.env.TEST_VAR = '123';
      expect(getEnvNumber('TEST_VAR', 42)).toBe(123);
    });

    it('should return negative numbers correctly', () => {
      process.env.TEST_VAR = '-456';
      expect(getEnvNumber('TEST_VAR', 42)).toBe(-456);
    });

    it('should return decimal numbers correctly', () => {
      process.env.TEST_VAR = '3.14';
      expect(getEnvNumber('TEST_VAR', 42)).toBe(3.14);
    });

    it('should throw error for NaN with raw value in message', () => {
      process.env.TEST_VAR = 'not-a-number';
      expect(() => getEnvNumber('TEST_VAR', 42)).toThrow('TEST_VAR must be a number, got: not-a-number');
    });

    it('should throw error for Infinity with raw value in message', () => {
      process.env.TEST_VAR = 'Infinity';
      expect(() => getEnvNumber('TEST_VAR', 42)).toThrow('TEST_VAR must be a finite number, got: Infinity');
    });

    it('should throw error for -Infinity with raw value in message', () => {
      process.env.TEST_VAR = '-Infinity';
      expect(() => getEnvNumber('TEST_VAR', 42)).toThrow('TEST_VAR must be a finite number, got: -Infinity');
    });

    it('should accept integers when requireInteger is true', () => {
      process.env.TEST_VAR = '100';
      expect(getEnvNumber('TEST_VAR', 42, { requireInteger: true })).toBe(100);
    });

    it('should reject decimals when requireInteger is true', () => {
      process.env.TEST_VAR = '1.5';
      expect(() => getEnvNumber('TEST_VAR', 42, { requireInteger: true }))
        .toThrow('TEST_VAR must be an integer, got: 1.5');
    });

    it('should accept decimals when requireInteger is false or not specified', () => {
      process.env.TEST_VAR = '1.5';
      expect(getEnvNumber('TEST_VAR', 42)).toBe(1.5);
      expect(getEnvNumber('TEST_VAR', 42, { requireInteger: false })).toBe(1.5);
    });

    it('should emit warning when warnOnDefault is true and using default', () => {
      delete process.env.TEST_VAR;
      const originalEmitWarning = process.emitWarning;
      const mockEmitWarning = jest.fn();
      process.emitWarning = mockEmitWarning;

      getEnvNumber('TEST_VAR', 42, { warnOnDefault: true });

      expect(mockEmitWarning).toHaveBeenCalledWith('TEST_VAR not set; defaulting to 42');
      process.emitWarning = originalEmitWarning;
    });

    it('should not emit warning when warnOnDefault is false', () => {
      delete process.env.TEST_VAR;
      const originalEmitWarning = process.emitWarning;
      const mockEmitWarning = jest.fn();
      process.emitWarning = mockEmitWarning;

      getEnvNumber('TEST_VAR', 42, { warnOnDefault: false });

      expect(mockEmitWarning).not.toHaveBeenCalled();
      process.emitWarning = originalEmitWarning;
    });

    it('should handle scientific notation correctly', () => {
      process.env.TEST_VAR = '1e3';
      expect(getEnvNumber('TEST_VAR', 42)).toBe(1000);
    });

    it('should reject scientific notation with requireInteger when result is not integer', () => {
      process.env.TEST_VAR = '1e-3';
      expect(() => getEnvNumber('TEST_VAR', 42, { requireInteger: true }))
        .toThrow('TEST_VAR must be an integer, got: 1e-3');
    });
  });
});
