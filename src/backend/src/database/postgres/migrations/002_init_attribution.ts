import { MigrationBuilder } from 'node-pg-migrate'; // v6.2.0
import { PostgresConnection } from '../../connection';

/**
 * Migration to create attribution-related tables with optimized schema and indexes
 * @param pgm - PostgreSQL migration builder instance
 */
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  // Create attribution model enum type
  pgm.createType('attribution_model', [
    'FIRST_TOUCH',
    'LAST_TOUCH',
    'LINEAR',
    'POSITION_BASED',
    'TIME_DECAY',
    'CUSTOM'
  ]);

  // Create marketing channel enum type
  pgm.createType('channel', [
    'SOCIAL',
    'EMAIL',
    'PAID_SEARCH',
    'ORGANIC_SEARCH',
    'DIRECT',
    'REFERRAL',
    'DISPLAY',
    'AFFILIATE',
    'VIDEO',
    'MOBILE_APP'
  ]);

  // Create attribution configurations table
  pgm.createTable('attribution_configs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    name: {
      type: 'varchar(100)',
      notNull: true
    },
    model: {
      type: 'attribution_model',
      notNull: true
    },
    attribution_window_start: {
      type: 'timestamptz',
      notNull: true
    },
    attribution_window_end: {
      type: 'timestamptz',
      notNull: true
    },
    channel_weights: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    },
    include_time_decay: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    decay_half_life_hours: {
      type: 'integer',
      check: 'decay_half_life_hours > 0'
    },
    custom_rules: {
      type: 'jsonb',
      default: '[]'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  }, {
    comment: 'Stores attribution model configurations and rules'
  });

  // Create touchpoints table
  pgm.createTable('touchpoints', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    visitor_id: {
      type: 'varchar(100)',
      notNull: true
    },
    session_id: {
      type: 'varchar(100)',
      notNull: true
    },
    channel: {
      type: 'channel',
      notNull: true
    },
    source: {
      type: 'varchar(100)',
      notNull: true
    },
    campaign: {
      type: 'varchar(100)'
    },
    medium: {
      type: 'varchar(100)'
    },
    content: {
      type: 'varchar(255)'
    },
    term: {
      type: 'varchar(100)'
    },
    landing_page: {
      type: 'varchar(2048)',
      notNull: true
    },
    referrer: {
      type: 'varchar(2048)'
    },
    metadata: {
      type: 'jsonb',
      default: '{}'
    },
    occurred_at: {
      type: 'timestamptz',
      notNull: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  }, {
    comment: 'Stores marketing touchpoint events'
  });

  // Create conversions table
  pgm.createTable('conversions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    visitor_id: {
      type: 'varchar(100)',
      notNull: true
    },
    conversion_type: {
      type: 'varchar(50)',
      notNull: true
    },
    value: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0
    },
    currency: {
      type: 'char(3)',
      notNull: true,
      default: 'USD'
    },
    metadata: {
      type: 'jsonb',
      default: '{}'
    },
    occurred_at: {
      type: 'timestamptz',
      notNull: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  }, {
    comment: 'Stores conversion events'
  });

  // Create attribution results table
  pgm.createTable('attribution_results', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    config_id: {
      type: 'uuid',
      notNull: true,
      references: 'attribution_configs'
    },
    touchpoint_id: {
      type: 'uuid',
      notNull: true,
      references: 'touchpoints'
    },
    conversion_id: {
      type: 'uuid',
      notNull: true,
      references: 'conversions'
    },
    weight: {
      type: 'decimal(5,4)',
      notNull: true,
      check: 'weight >= 0 AND weight <= 1'
    },
    revenue_credit: {
      type: 'decimal(15,2)',
      notNull: true,
      default: 0
    },
    position_in_path: {
      type: 'integer',
      notNull: true
    },
    time_to_conversion: {
      type: 'interval',
      notNull: true
    },
    calculated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  }, {
    comment: 'Stores attribution calculation results'
  });

  // Create optimized indexes
  pgm.createIndex('attribution_configs', ['model', 'is_active']);
  pgm.createIndex('attribution_configs', ['attribution_window_start', 'attribution_window_end']);
  
  pgm.createIndex('touchpoints', ['visitor_id', 'occurred_at']);
  pgm.createIndex('touchpoints', ['channel', 'occurred_at']);
  pgm.createIndex('touchpoints', ['session_id']);
  pgm.createIndex('touchpoints', 'occurred_at');
  
  pgm.createIndex('conversions', ['visitor_id', 'occurred_at']);
  pgm.createIndex('conversions', ['conversion_type', 'occurred_at']);
  pgm.createIndex('conversions', 'occurred_at');
  
  pgm.createIndex('attribution_results', ['config_id', 'calculated_at']);
  pgm.createIndex('attribution_results', ['touchpoint_id', 'conversion_id']);
  pgm.createIndex('attribution_results', ['conversion_id', 'weight']);

  // Create updated_at trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      NEW.updated_at = current_timestamp;
      RETURN NEW;
    END;
    `
  );

  // Add updated_at triggers
  pgm.createTrigger(
    'attribution_configs',
    'update_updated_at_trigger',
    {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW'
    }
  );
};

/**
 * Rollback migration by dropping all attribution-related tables and types
 * @param pgm - PostgreSQL migration builder instance
 */
export const down = async (pgm: MigrationBuilder): Promise<void> => {
  // Drop tables in reverse order of dependencies
  pgm.dropTable('attribution_results');
  pgm.dropTable('conversions');
  pgm.dropTable('touchpoints');
  pgm.dropTable('attribution_configs');

  // Drop trigger function
  pgm.dropFunction('update_updated_at_column', []);

  // Drop enum types
  pgm.dropType('channel');
  pgm.dropType('attribution_model');
};