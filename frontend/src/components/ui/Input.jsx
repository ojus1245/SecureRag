import React, { forwardRef, useState } from 'react';
import {
    TextField,
    InputAdornment,
    FormHelperText,
    FormControl,
    InputLabel,
    OutlinedInput,
    CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import IconButton from './IconButton';

const StyledTextField = styled(TextField)(({ theme, error }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: theme.shape.borderRadius,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main
            }
        },
        '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2
            }
        },
        '&.Mui-error': {
            '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.error.main
            }
        }
    }
}));

const Input = forwardRef(({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    error = false,
    helperText,
    required = false,
    disabled = false,
    loading = false,
    multiline = false,
    rows = 1,
    maxRows,
    minRows,
    fullWidth = true,
    size = 'medium',
    variant = 'outlined',
    searchable = false,
    clearable = false,
    password = false,
    startIcon,
    endIcon,
    onKeyDown,
    onFocus,
    onBlur,
    autoComplete,
    autoFocus = false,
    maxLength,
    showCharCount = false,
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    const handleTogglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleClear = () => {
        if (onChange) {
            onChange({ target: { value: '' } });
        }
    };

    const inputType = password ? (showPassword ? 'text' : 'password') : type;

    const inputProps = {
        ref,
        label,
        type: inputType,
        value,
        onChange,
        placeholder,
        error,
        helperText,
        required,
        disabled: disabled || loading,
        multiline,
        rows: multiline ? rows : undefined,
        maxRows: multiline ? maxRows : undefined,
        minRows: multiline ? minRows : undefined,
        fullWidth,
        size,
        variant,
        onKeyDown,
        onFocus: (e) => {
            setFocused(true);
            if (onFocus) onFocus(e);
        },
        onBlur: (e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
        },
        autoComplete,
        autoFocus,
        inputProps: {
            maxLength
        },
        InputProps: {
            startAdornment: (startIcon || searchable) && (
                <InputAdornment position="start">
                    {searchable ? <SearchIcon /> : startIcon}
                </InputAdornment>
            ),
            endAdornment: (
                <InputAdornment position="end">
                    {loading && <CircularProgress size={20} />}
                    {password && (
                        <IconButton
                            icon={showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            onClick={handleTogglePassword}
                            tooltip={showPassword ? 'Hide password' : 'Show password'}
                            size="small"
                        />
                    )}
                    {clearable && value && !disabled && (
                        <IconButton
                            icon={<ClearIcon />}
                            onClick={handleClear}
                            tooltip="Clear"
                            size="small"
                        />
                    )}
                    {endIcon}
                </InputAdornment>
            )
        },
        ...props
    };

    return (
        <StyledTextField {...inputProps} />
    );
});

Input.displayName = 'Input';

export default Input;