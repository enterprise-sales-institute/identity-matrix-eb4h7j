import { ValidationService } from '../../../src/lib/validation/validation.service';
import { ValidationError } from '../../../src/types/error.types';
import Joi from 'joi';
import NodeCache from 'node-cache';

describe('ValidationService', () => {
  let validationService: ValidationService;
  let performanceMetrics: {
    executionTimes: number[];
    memoryUsage: number[];
  };

  // Test schema factory for generating versioned schemas
  const testSchemaFactory = (version: string) => ({
    schema: Joi.object({
      id: Joi.string().required(),
      email: Joi.string().email().required(),
      age: Joi.number().min(0).max(120),
      metadata: Joi.object().unknown(true)
    }),
    version,
    cacheable: true,
    timeoutMs: 1000
  });

  beforeEach(() => {
    // Initialize validation service with test configuration
    validationService = new ValidationService({
      stdTTL: 60,
      checkperiod: 30,
      maxKeys: 100
    });

    // Reset performance metrics
    performanceMetrics = {
      executionTimes: [],
      memoryUsage: []
    };

    // Clear any existing cache
    jest.spyOn(NodeCache.prototype, 'del').mockImplementation(() => 1);
    jest.spyOn(NodeCache.prototype, 'get').mockImplementation(() => undefined);
    jest.spyOn(NodeCache.prototype, 'set').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Registration', () => {
    it('should successfully register a valid schema with version control', async () => {
      const schemaName = 'userSchema';
      const schemaConfig = testSchemaFactory('1.0.0');

      expect(() => {
        validationService.registerSchema(schemaName, schemaConfig);
      }).not.toThrow();

      const registeredSchema = validationService.getSchema(schemaName);
      expect(registeredSchema).toBeDefined();
      expect(registeredSchema?.version).toBe('1.0.0');
    });

    it('should throw error when registering invalid schema', () => {
      const schemaName = 'invalidSchema';
      const invalidSchema = {
        schema: null,
        version: '1.0.0',
        cacheable: true,
        timeoutMs: 1000
      };

      expect(() => {
        validationService.registerSchema(schemaName, invalidSchema);
      }).toThrow(ValidationError);
    });

    it('should handle schema version updates correctly', () => {
      const schemaName = 'versionedSchema';
      const v1Schema = testSchemaFactory('1.0.0');
      const v2Schema = testSchemaFactory('2.0.0');

      validationService.registerSchema(schemaName, v1Schema);
      validationService.registerSchema(schemaName, v2Schema);

      const currentSchema = validationService.getSchema(schemaName);
      expect(currentSchema?.version).toBe('2.0.0');
    });

    it('should handle concurrent schema registrations', async () => {
      const schemaName = 'concurrentSchema';
      const schemas = Array.from({ length: 5 }, (_, i) => 
        testSchemaFactory(`1.0.${i}`)
      );

      await Promise.all(
        schemas.map(schema => 
          Promise.resolve(validationService.registerSchema(schemaName, schema))
        )
      );

      const finalSchema = validationService.getSchema(schemaName);
      expect(finalSchema).toBeDefined();
      expect(finalSchema?.version).toBe('1.0.4');
    });
  });

  describe('Validation Behavior', () => {
    const schemaName = 'testSchema';
    const validData = {
      id: '123',
      email: 'test@example.com',
      age: 25,
      metadata: { source: 'test' }
    };

    beforeEach(() => {
      validationService.registerSchema(schemaName, testSchemaFactory('1.0.0'));
    });

    it('should successfully validate correct data', async () => {
      const result = await validationService.validateSchema(schemaName, validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.schemaVersion).toBe('1.0.0');
    });

    it('should return validation errors for invalid data', async () => {
      const invalidData = {
        id: '123',
        email: 'invalid-email',
        age: 150,
        metadata: { source: 'test' }
      };

      const result = await validationService.validateSchema(schemaName, invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('age');
    });

    it('should utilize cache for repeated validations', async () => {
      const cacheGetSpy = jest.spyOn(NodeCache.prototype, 'get');
      const cacheSetSpy = jest.spyOn(NodeCache.prototype, 'set');

      // First validation - should set cache
      await validationService.validateSchema(schemaName, validData, { cache: true });
      expect(cacheSetSpy).toHaveBeenCalled();

      // Second validation - should hit cache
      await validationService.validateSchema(schemaName, validData, { cache: true });
      expect(cacheGetSpy).toHaveBeenCalled();
    });

    it('should handle validation timeouts', async () => {
      // Register schema with very short timeout
      validationService.registerSchema(schemaName, {
        ...testSchemaFactory('1.0.0'),
        timeoutMs: 1
      });

      // Create large data to force timeout
      const largeData = {
        ...validData,
        metadata: Array(10000).fill({ key: 'value' })
      };

      await expect(
        validationService.validateSchema(schemaName, largeData)
      ).rejects.toThrow('Validation timeout');
    });

    it('should maintain performance under load', async () => {
      const startTime = process.hrtime();
      const validations = Array(100).fill(validData).map(() =>
        validationService.validateSchema(schemaName, validData)
      );

      const results = await Promise.all(validations);
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1e6;

      expect(results).toHaveLength(100);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      results.forEach(result => expect(result.isValid).toBe(true));
    });

    it('should handle concurrent validations efficiently', async () => {
      const concurrentValidations = 50;
      const validationPromises = Array(concurrentValidations)
        .fill(null)
        .map(() => validationService.validateSchema(schemaName, validData));

      const results = await Promise.all(validationPromises);
      
      results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.schemaVersion).toBe('1.0.0');
      });
    });

    it('should respect memory limits during validation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const largeDataSet = Array(1000).fill(validData);

      await Promise.all(
        largeDataSet.map(data => 
          validationService.validateSchema(schemaName, data)
        )
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      expect(memoryIncrease).toBeLessThan(100); // Should use less than 100MB additional memory
    });
  });

  describe('Error Handling', () => {
    it('should handle schema not found error', async () => {
      await expect(
        validationService.validateSchema('nonexistentSchema', {})
      ).rejects.toThrow(ValidationError);
    });

    it('should handle schema compilation errors', () => {
      const invalidSchema = {
        schema: Joi.object({
          field: Joi.invalid()
        }),
        version: '1.0.0',
        cacheable: true,
        timeoutMs: 1000
      };

      expect(() => {
        validationService.registerSchema('invalidSchema', invalidSchema);
      }).toThrow(ValidationError);
    });

    it('should format validation errors correctly', async () => {
      const schemaName = 'errorSchema';
      validationService.registerSchema(schemaName, testSchemaFactory('1.0.0'));

      const invalidData = {
        id: 123, // Should be string
        email: 'invalid',
        age: -1,
        metadata: null
      };

      const result = await validationService.validateSchema(schemaName, invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('id');
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('age');
      expect(result.errors).toHaveProperty('metadata');
    });
  });
});