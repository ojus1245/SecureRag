import { VALIDATION_RULES } from './constants';

// Email validation
export const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) return 'Invalid email format';
    return null;
};

// Username validation
export const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH)
        return `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`;
    if (username.length > VALIDATION_RULES.USERNAME.MAX_LENGTH)
        return `Username cannot exceed ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`;
    if (!VALIDATION_RULES.USERNAME.PATTERN.test(username))
        return 'Username can only contain letters, numbers, and underscores';
    return null;
};

// Password validation
export const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH)
        return `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`;
    if (!VALIDATION_RULES.PASSWORD.PATTERN.test(password))
        return 'Password must contain uppercase, lowercase, number, and special character';
    return null;
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
};

// Document title validation
export const validateDocumentTitle = (title) => {
    if (!title) return 'Title is required';
    if (title.length < VALIDATION_RULES.DOCUMENT_TITLE.MIN_LENGTH)
        return `Title must be at least ${VALIDATION_RULES.DOCUMENT_TITLE.MIN_LENGTH} characters`;
    if (title.length > VALIDATION_RULES.DOCUMENT_TITLE.MAX_LENGTH)
        return `Title cannot exceed ${VALIDATION_RULES.DOCUMENT_TITLE.MAX_LENGTH} characters`;
    return null;
};

// Department validation
export const validateDepartment = (department) => {
    if (!department) return 'Department is required';
    if (department.length < 2) return 'Department must be at least 2 characters';
    if (department.length > 100) return 'Department cannot exceed 100 characters';
    return null;
};

// Classification validation
export const validateClassification = (classification) => {
    const validClassifications = ['public', 'internal', 'confidential', 'restricted'];
    if (!classification) return 'Classification is required';
    if (!validClassifications.includes(classification)) return 'Invalid classification';
    return null;
};

// Tags validation
export const validateTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    if (tags.length > 20) return 'Maximum 20 tags allowed';

    for (const tag of tags) {
        if (tag.length > 50) return 'Tag cannot exceed 50 characters';
        if (!/^[a-zA-Z0-9-_]+$/.test(tag)) return 'Tags can only contain letters, numbers, hyphens, and underscores';
    }

    return null;
};

// File validation
export const validateFile = (file, options = {}) => {
    const {
        maxSize = 10 * 1024 * 1024,
        allowedTypes = []
    } = options;

    if (!file) return 'File is required';
    if (file.size > maxSize) return `File exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(1)}MB`;

    if (allowedTypes.length > 0) {
        const fileType = file.type || '';
        const isAllowed = allowedTypes.some(type => {
            if (type.includes('*')) {
                return fileType.startsWith(type.replace('*', ''));
            }
            return fileType === type;
        });

        if (!isAllowed) return 'File type not allowed';
    }

    return null;
};

// Query validation
export const validateQuery = (query) => {
    if (!query) return 'Query is required';
    if (query.length < 3) return 'Query must be at least 3 characters';
    if (query.length > 2000) return 'Query cannot exceed 2000 characters';
    return null;
};

// Form validation
export const validateForm = (formData, rules) => {
    const errors = {};

    Object.entries(rules).forEach(([field, validators]) => {
        const value = formData[field];

        for (const validator of validators) {
            const error = validator(value, formData);
            if (error) {
                errors[field] = error;
                break;
            }
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Required field validation
export const required = (message = 'This field is required') => {
    return (value) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
            return message;
        }
        return null;
    };
};

// Min length validation
export const minLength = (min, message) => {
    return (value) => {
        if (value && value.length < min) {
            return message || `Must be at least ${min} characters`;
        }
        return null;
    };
};

// Max length validation
export const maxLength = (max, message) => {
    return (value) => {
        if (value && value.length > max) {
            return message || `Cannot exceed ${max} characters`;
        }
        return null;
    };
};

// Pattern validation
export const pattern = (regex, message) => {
    return (value) => {
        if (value && !regex.test(value)) {
            return message || 'Invalid format';
        }
        return null;
    };
};

export default {
    validateEmail,
    validateUsername,
    validatePassword,
    validateConfirmPassword,
    validateDocumentTitle,
    validateDepartment,
    validateClassification,
    validateTags,
    validateFile,
    validateQuery,
    validateForm,
    required,
    minLength,
    maxLength,
    pattern
};