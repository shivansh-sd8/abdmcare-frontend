export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validationPatterns = {
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  pincode: /^\d{6}$/,
  aadhar: /^\d{12}$/,
  abhaNumber: /^\d{14}$/,
  abhaAddress: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/,
  name: /^[a-zA-Z\s]+$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  registrationNo: /^[A-Z0-9/-]+$/,
  uhid: /^[A-Z0-9]+$/,
};

export const validationMessages = {
  required: 'This field is required',
  mobile: 'Enter a valid 10-digit mobile number (starting with 6-9)',
  email: 'Enter a valid email address (e.g., user@example.com)',
  pincode: 'Enter a valid 6-digit pincode',
  aadhar: 'Enter a valid 12-digit Aadhaar number',
  abhaNumber: 'Enter a valid 14-digit ABHA number',
  abhaAddress: 'Enter a valid ABHA address (e.g., username@abdm)',
  name: 'Only letters and spaces are allowed',
  alphanumeric: 'Only letters, numbers and spaces are allowed',
  pan: 'Enter a valid PAN (e.g., ABCDE1234F)',
  registrationNo: 'Enter a valid registration number',
  minLength: (min: number) => `Minimum ${min} characters required`,
  maxLength: (max: number) => `Maximum ${max} characters allowed`,
  min: (min: number) => `Minimum value is ${min}`,
  max: (max: number) => `Maximum value is ${max}`,
  age: 'Age must be between 0 and 150 years',
  futureDate: 'Date cannot be in the future',
  pastDate: 'Date cannot be in the past',
};

export const validate = (value: any, rules: ValidationRule): ValidationResult => {
  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return {
      isValid: false,
      error: rules.message || validationMessages.required,
    };
  }

  // If value is empty and not required, it's valid
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: true };
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      isValid: false,
      error: rules.message || 'Invalid format',
    };
  }

  // Length checks
  if (rules.minLength && value.length < rules.minLength) {
    return {
      isValid: false,
      error: rules.message || validationMessages.minLength(rules.minLength),
    };
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      isValid: false,
      error: rules.message || validationMessages.maxLength(rules.maxLength),
    };
  }

  // Number range checks
  if (rules.min !== undefined && Number(value) < rules.min) {
    return {
      isValid: false,
      error: rules.message || validationMessages.min(rules.min),
    };
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return {
      isValid: false,
      error: rules.message || validationMessages.max(rules.max),
    };
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    return {
      isValid: false,
      error: rules.message || 'Invalid value',
    };
  }

  return { isValid: true };
};

export const validateForm = (
  formData: Record<string, any>,
  validationRules: Record<string, ValidationRule>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  Object.keys(validationRules).forEach((field) => {
    const value = field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj?.[key], formData)
      : formData[field];
    
    const result = validate(value, validationRules[field]);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Specific validators
export const validateMobile = (mobile: string): ValidationResult => {
  return validate(mobile, {
    required: true,
    pattern: validationPatterns.mobile,
    message: validationMessages.mobile,
  });
};

export const validateEmail = (email: string): ValidationResult => {
  if (!email) return { isValid: true }; // Email is optional
  return validate(email, {
    pattern: validationPatterns.email,
    message: validationMessages.email,
  });
};

export const validatePincode = (pincode: string): ValidationResult => {
  return validate(pincode, {
    pattern: validationPatterns.pincode,
    message: validationMessages.pincode,
  });
};

export const validateAge = (dob: string): ValidationResult => {
  if (!dob) return { isValid: false, error: 'Date of birth is required' };
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (birthDate > today) {
    return { isValid: false, error: validationMessages.futureDate };
  }
  
  const age = today.getFullYear() - birthDate.getFullYear();
  if (age < 0 || age > 150) {
    return { isValid: false, error: validationMessages.age };
  }
  
  return { isValid: true };
};

export const validateAadhar = (aadhar: string): ValidationResult => {
  if (!aadhar) return { isValid: true }; // Aadhar is optional
  return validate(aadhar, {
    pattern: validationPatterns.aadhar,
    message: validationMessages.aadhar,
  });
};

export const validateABHANumber = (abhaNumber: string): ValidationResult => {
  if (!abhaNumber) return { isValid: true }; // ABHA is optional
  return validate(abhaNumber, {
    pattern: validationPatterns.abhaNumber,
    message: validationMessages.abhaNumber,
  });
};
