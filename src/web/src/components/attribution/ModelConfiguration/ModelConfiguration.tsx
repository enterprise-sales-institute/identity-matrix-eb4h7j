/**
 * @fileoverview React component for configuring attribution models with real-time validation
 * @version 1.0.0
 */

// External imports - v18.2.0
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form'; // v7.45.0
import {
  TextField,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material'; // v5.0.0
import * as yup from 'yup'; // v1.2.0

// Internal imports
import {
  Container,
  FormSection,
  ModelCard,
  FieldGroup,
  InputWrapper,
  LabelWrapper,
  HelperText,
  ErrorText,
  ButtonContainer,
  Divider
} from './ModelConfiguration.styles';
import { useAttribution } from '../../../hooks/useAttribution';
import {
  Channel,
  AttributionModelType,
  ModelValidationError
} from '../../../types/attribution.types';
import {
  MODEL_LABELS,
  CHANNEL_LABELS,
  DEFAULT_CHANNEL_WEIGHTS,
  MIN_CHANNEL_WEIGHT,
  MAX_CHANNEL_WEIGHT,
  TOTAL_WEIGHT_SUM,
  ATTRIBUTION_PERIODS
} from '../../../constants/attribution.constants';

// Component props interface
interface ModelConfigurationProps {
  onSave: () => Promise<void>;
  onCancel: () => void;
  onError: (error: ModelValidationError) => void;
  initialData?: ModelConfiguration | null;
}

// Form data interface
interface ModelFormData {
  modelType: AttributionModelType;
  channelWeights: Record<Channel, number>;
  attributionWindow: string;
  customParameters: Record<string, any>;
}

// Validation schema
const validationSchema = yup.object().shape({
  modelType: yup.string().required('Model type is required'),
  channelWeights: yup.object().test(
    'weights-sum',
    'Channel weights must sum to 100%',
    (weights) => {
      if (!weights) return false;
      const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
      return Math.abs(sum - TOTAL_WEIGHT_SUM) < 0.0001;
    }
  ),
  attributionWindow: yup.string().required('Attribution window is required'),
  customParameters: yup.object()
});

/**
 * Attribution model configuration component with real-time validation
 */
const ModelConfiguration: React.FC<ModelConfigurationProps> = ({
  onSave,
  onCancel,
  onError,
  initialData
}) => {
  // Hooks
  const { currentModel, updateModel, validateModel } = useAttribution();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ModelValidationError[]>([]);

  // Form initialization
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<ModelFormData>({
    defaultValues: {
      modelType: initialData?.model || AttributionModelType.LINEAR,
      channelWeights: initialData?.channelWeights || DEFAULT_CHANNEL_WEIGHTS,
      attributionWindow: initialData?.attributionWindow || '30d',
      customParameters: initialData?.customRules || {}
    },
    resolver: yup.reach(validationSchema)
  });

  const modelType = watch('modelType');

  // Memoized channel options
  const channelOptions = useMemo(() => 
    Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
      value,
      label
    })), []
  );

  // Handle form submission
  const onSubmit = useCallback(async (data: ModelFormData) => {
    try {
      setIsSubmitting(true);
      setValidationErrors([]);

      const validationResult = await validateModel(data);
      if (!validationResult.isValid) {
        setValidationErrors(validationResult.errors);
        onError(validationResult.errors[0]);
        return;
      }

      await updateModel({
        model: data.modelType,
        channelWeights: data.channelWeights,
        attributionWindow: data.attributionWindow,
        customRules: data.customParameters
      });

      await onSave();
    } catch (error) {
      setValidationErrors([{
        field: 'general',
        messages: ['Failed to save model configuration'],
        code: 'SAVE_ERROR'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [updateModel, validateModel, onSave, onError]);

  // Reset form when initial data changes
  useEffect(() => {
    if (initialData) {
      reset({
        modelType: initialData.model,
        channelWeights: initialData.channelWeights,
        attributionWindow: initialData.attributionWindow,
        customParameters: initialData.customRules
      });
    }
  }, [initialData, reset]);

  return (
    <Container>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <ModelCard>
          <FormSection>
            <Controller
              name="modelType"
              control={control}
              render={({ field }) => (
                <FieldGroup>
                  <LabelWrapper>Attribution Model</LabelWrapper>
                  <Select
                    {...field}
                    fullWidth
                    error={!!errors.modelType}
                    disabled={isSubmitting}
                  >
                    {Object.entries(MODEL_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.modelType && (
                    <ErrorText>{errors.modelType.message}</ErrorText>
                  )}
                </FieldGroup>
              )}
            />

            <Divider />

            <Controller
              name="channelWeights"
              control={control}
              render={({ field }) => (
                <FieldGroup>
                  <LabelWrapper>Channel Weights</LabelWrapper>
                  {channelOptions.map(({ value, label }) => (
                    <InputWrapper key={value}>
                      <TextField
                        fullWidth
                        label={label}
                        type="number"
                        inputProps={{
                          min: MIN_CHANNEL_WEIGHT * 100,
                          max: MAX_CHANNEL_WEIGHT * 100,
                          step: 0.1
                        }}
                        value={field.value[value as Channel] * 100}
                        onChange={(e) => {
                          const newWeights = {
                            ...field.value,
                            [value]: Number(e.target.value) / 100
                          };
                          field.onChange(newWeights);
                        }}
                        error={!!errors.channelWeights}
                        disabled={isSubmitting}
                      />
                    </InputWrapper>
                  ))}
                  {errors.channelWeights && (
                    <ErrorText>{errors.channelWeights.message}</ErrorText>
                  )}
                </FieldGroup>
              )}
            />

            <Divider />

            <Controller
              name="attributionWindow"
              control={control}
              render={({ field }) => (
                <FieldGroup>
                  <LabelWrapper>Attribution Window</LabelWrapper>
                  <Select
                    {...field}
                    fullWidth
                    error={!!errors.attributionWindow}
                    disabled={isSubmitting}
                  >
                    {Object.entries(ATTRIBUTION_PERIODS).map(([key, value]) => (
                      <MenuItem key={key} value={key}>
                        {`${value} Days`}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.attributionWindow && (
                    <ErrorText>{errors.attributionWindow.message}</ErrorText>
                  )}
                </FieldGroup>
              )}
            />

            {modelType === AttributionModelType.TIME_DECAY && (
              <Controller
                name="customParameters.decayHalfLife"
                control={control}
                render={({ field }) => (
                  <FieldGroup>
                    <LabelWrapper>Decay Half-Life (Days)</LabelWrapper>
                    <TextField
                      {...field}
                      type="number"
                      fullWidth
                      inputProps={{ min: 1, max: 30 }}
                      error={!!errors.customParameters?.decayHalfLife}
                      disabled={isSubmitting}
                    />
                  </FieldGroup>
                )}
              />
            )}
          </FormSection>

          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationErrors.map((error, index) => (
                <div key={index}>{error.messages.join(', ')}</div>
              ))}
            </Alert>
          )}

          <ButtonContainer>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              startIcon={isSubmitting && <CircularProgress size={20} />}
            >
              Save Configuration
            </Button>
          </ButtonContainer>
        </ModelCard>
      </form>
    </Container>
  );
};

export default ModelConfiguration;