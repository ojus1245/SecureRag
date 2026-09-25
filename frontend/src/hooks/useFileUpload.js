import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

export const useFileUpload = (options = {}) => {
    const {
        maxFileSize = 10 * 1024 * 1024, // 10MB
        allowedTypes = [],
        multiple = false,
        onUpload,
        onProgress,
        onError,
        onSuccess,
        autoUpload = true
    } = options;

    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [errors, setErrors] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    const inputRef = useRef(null);
    const uploadQueueRef = useRef([]);

    // Validate file
    const validateFile = useCallback((file) => {
        const errors = [];

        // Check file size
        if (file.size > maxFileSize) {
            errors.push(`File ${file.name} exceeds maximum size of ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
        }

        // Check file type
        if (allowedTypes.length > 0) {
            const fileType = file.type || '';
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

            const isAllowed = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    return fileExtension === type;
                }
                if (type.includes('*')) {
                    const pattern = type.replace('*', '');
                    return fileType.startsWith(pattern);
                }
                return fileType === type;
            });

            if (!isAllowed) {
                errors.push(`File ${file.name} has unsupported type`);
            }
        }

        return errors;
    }, [maxFileSize, allowedTypes]);

    // Handle file selection
    const handleFiles = useCallback((selectedFiles) => {
        setErrors([]);

        const validFiles = [];
        const fileErrors = [];

        Array.from(selectedFiles).forEach(file => {
            const fileValidationErrors = validateFile(file);

            if (fileValidationErrors.length === 0) {
                validFiles.push(file);
            } else {
                fileErrors.push(...fileValidationErrors);
            }
        });

        if (fileErrors.length > 0) {
            setErrors(fileErrors);
            onError?.(fileErrors);
        }

        if (validFiles.length > 0) {
            setFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);

            if (autoUpload) {
                validFiles.forEach(uploadFile);
            }
        }
    }, [validateFile, multiple, autoUpload, onError]);

    // Upload single file
    const uploadFile = useCallback(async (file) => {
        setUploading(true);
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        try {
            // Simulate upload or use provided upload function
            if (onUpload) {
                const result = await onUpload(file, (progress) => {
                    setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
                    onProgress?.(file, progress);
                });

                setUploadedFiles(prev => [...prev, { file, result }]);
                onSuccess?.(result, file);
            } else {
                // Simulate upload with progress
                for (let i = 0; i <= 100; i += 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    setUploadProgress(prev => ({ ...prev, [file.name]: i }));
                    onProgress?.(file, i);
                }

                setUploadedFiles(prev => [...prev, { file, result: null }]);
                onSuccess?.(null, file);
            }

            return true;
        } catch (error) {
            logger.error(`Failed to upload ${file.name}:`, error);
            setErrors(prev => [...prev, `Failed to upload ${file.name}: ${error.message}`]);
            onError?.([error.message]);
            return false;
        } finally {
            setUploading(false);
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        }
    }, [onUpload, onProgress, onSuccess, onError]);

    // Upload all pending files
    const uploadAll = useCallback(async () => {
        const results = [];

        for (const file of files) {
            const result = await uploadFile(file);
            results.push({ file, success: result });
        }

        return results;
    }, [files, uploadFile]);

    // Remove file
    const removeFile = useCallback((fileName) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
    }, []);

    // Clear all files
    const clearFiles = useCallback(() => {
        setFiles([]);
        setUploadedFiles([]);
        setUploadProgress({});
        setErrors([]);
    }, []);

    // Handle drag events
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = e.dataTransfer.files;
        handleFiles(droppedFiles);
    }, [handleFiles]);

    // Open file dialog
    const openFileDialog = useCallback(() => {
        inputRef.current?.click();
    }, []);

    // Handle input change
    const handleInputChange = useCallback((e) => {
        handleFiles(e.target.files);
        e.target.value = '';
    }, [handleFiles]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            uploadQueueRef.current = [];
        };
    }, []);

    // Get total progress
    const getTotalProgress = useCallback(() => {
        if (files.length === 0) return 0;

        const totalProgress = Object.values(uploadProgress).reduce((sum, progress) => sum + progress, 0);
        return Math.round(totalProgress / files.length);
    }, [files, uploadProgress]);

    return {
        files,
        uploading,
        uploadProgress,
        uploadedFiles,
        errors,
        dragActive,
        totalProgress: getTotalProgress(),
        inputRef,
        handleFiles,
        uploadFile,
        uploadAll,
        removeFile,
        clearFiles,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        openFileDialog,
        handleInputChange
    };
};

export default useFileUpload;