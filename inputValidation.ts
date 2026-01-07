// Input validation utilities for LogInput component
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: number;
}

export interface ValidationRules {
  min: number;
  max: number;
  required?: boolean;
  integer?: boolean;
}

// Validation rules for each metric
export const VALIDATION_RULES = {
  rhr: { min: 30, max: 200, required: true, integer: true },
  hrv: { min: 10, max: 200, required: true, integer: true },
  protein: { min: 0, max: 500, required: true, integer: true },
  sleep: { min: 0, max: 24, required: true, integer: false },
  gut: { min: 1, max: 5, required: true, integer: true },
  symptomScore: { min: 1, max: 5, required: true, integer: true }
} as const;

export const validateNumericInput = (
  value: string, 
  rules: ValidationRules
): ValidationResult => {
  // Empty value check
  if (!value.trim()) {
    return rules.required 
      ? { isValid: false, error: 'This field is required' }
      : { isValid: true, value: 0 };
  }

  // Numeric conversion
  const numValue = parseFloat(value);
  
  // NaN check
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  // Integer check
  if (rules.integer && !Number.isInteger(numValue)) {
    return { isValid: false, error: 'Please enter a whole number' };
  }

  // Range validation
  if (numValue < rules.min) {
    return { isValid: false, error: `Minimum value is ${rules.min}` };
  }
  
  if (numValue > rules.max) {
    return { isValid: false, error: `Maximum value is ${rules.max}` };
  }

  return { isValid: true, value: numValue };
};

export const validateTimeInput = (timeStr: string): ValidationResult => {
  if (!timeStr.trim()) {
    return { isValid: false, error: 'Sleep time is required' };
  }

  // Parse HH:MM format
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Use HH:MM format (e.g., 07:30)' };
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validate hours and minutes
  if (isNaN(hours) || isNaN(minutes)) {
    return { isValid: false, error: 'Invalid time format' };
  }

  if (hours < 0 || hours > 23) {
    return { isValid: false, error: 'Hours must be between 0-23' };
  }

  if (minutes < 0 || minutes > 59) {
    return { isValid: false, error: 'Minutes must be between 0-59' };
  }

  // Convert to decimal hours
  const decimalHours = hours + (minutes / 60);
  
  if (decimalHours < 1 || decimalHours > 16) {
    return { isValid: false, error: 'Sleep duration should be 1-16 hours' };
  }

  return { isValid: true, value: decimalHours };
};

export const validateTextInput = (value: string, maxLength = 100): ValidationResult => {
  if (value.length > maxLength) {
    return { isValid: false, error: `Maximum ${maxLength} characters allowed` };
  }

  // Basic XSS prevention
  const sanitized = value.replace(/[<>\"'&]/g, '');
  if (sanitized !== value) {
    return { isValid: false, error: 'Invalid characters detected' };
  }

  return { isValid: true, value: sanitized };
};

// Form validation state type
export interface FormValidationState {
  [key: string]: {
    isValid: boolean;
    error?: string;
    touched: boolean;
  };
}

export const getInitialValidationState = (): FormValidationState => ({
  sleep: { isValid: true, touched: false },
  rhr: { isValid: true, touched: false },
  hrv: { isValid: true, touched: false },
  protein: { isValid: true, touched: false },
  gut: { isValid: true, touched: false },
  symptomScore: { isValid: true, touched: false },
  symptomName: { isValid: true, touched: false }
});

export const isFormValid = (validationState: FormValidationState): boolean => {
  return Object.values(validationState).every(field => field.isValid);
};