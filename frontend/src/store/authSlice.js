import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';

const getUserFromStorage = () => {
    try {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

const getTokenFromStorage = () => {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
};

const savedUser = getUserFromStorage();
const savedToken = getTokenFromStorage();

// Initial state
const initialState = {
    user: savedUser,
    isAuthenticated: !!savedUser && !!savedToken,
    isLoading: false,
    error: null,
    token: savedToken,
    refreshToken: localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'),
    mfaRequired: false,
    mfaVerified: false,
    sessionExpiry: null,
    permissions: savedUser?.role?.permissions || savedUser?.permissions || [],
    securityClearance: savedUser?.securityClearance || null,
    role: savedUser?.role?.name || (typeof savedUser?.role === 'string' ? savedUser?.role : null),
    lastLogin: savedUser?.lastLogin || null,
    preferences: savedUser?.preferences || {
        theme: 'light',
        language: 'en',
        notifications: true,
        emailNotifications: true,
        pushNotifications: true,
        securityAlerts: true,
        documentUpdates: true,
        weeklyDigest: false
    }
};

// Async thunks
export const loginUser = createAsyncThunk(
    'auth/login',
    async ({ email, password, rememberMe }, { rejectWithValue }) => {
        try {
            logger.info('Attempting login...');
            const response = await authService.login(email, password, rememberMe);

            if (response.mfaRequired) {
                return { mfaRequired: true };
            }

            return response;
        } catch (error) {
            logger.error('Login failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            logger.info('Attempting registration...');
            const response = await authService.register(userData);
            return response.data;
        } catch (error) {
            logger.error('Registration failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            logger.info('Attempting logout...');
            await authService.logout();
            return null;
        } catch (error) {
            logger.error('Logout failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const response = await authService.refreshToken(auth.refreshToken);
            return response;
        } catch (error) {
            logger.error('Token refresh failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const user = await authService.getCurrentUser();
            return user;
        } catch (error) {
            logger.error('Failed to get current user:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async ({ currentPassword, newPassword }, { rejectWithValue }) => {
        try {
            const response = await authService.changePassword(currentPassword, newPassword);
            return response;
        } catch (error) {
            logger.error('Password change failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const verifyMfa = createAsyncThunk(
    'auth/verifyMfa',
    async (code, { rejectWithValue }) => {
        try {
            const response = await authService.verifyMfa(code);
            return response;
        } catch (error) {
            logger.error('MFA verification failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'auth/updateProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            const response = await authService.updateProfile(profileData);
            return response;
        } catch (error) {
            logger.error('Profile update failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const updatePreferences = createAsyncThunk(
    'auth/updatePreferences',
    async (preferences, { rejectWithValue }) => {
        try {
            const response = await authService.updatePreferences(preferences);
            return response;
        } catch (error) {
            logger.error('Preferences update failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const enableMfa = createAsyncThunk(
    'auth/enableMfa',
    async (_, { rejectWithValue }) => {
        try {
            const response = await authService.enableMfa();
            return response;
        } catch (error) {
            logger.error('Enable MFA failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const disableMfa = createAsyncThunk(
    'auth/disableMfa',
    async (code, { rejectWithValue }) => {
        try {
            const response = await authService.disableMfa(code);
            return response;
        } catch (error) {
            logger.error('Disable MFA failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Create slice
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;

            if (action.payload) {
                state.permissions = action.payload.role?.permissions || [];
                state.securityClearance = action.payload.securityClearance;
                state.role = action.payload.role?.name;
            }
        },

        setTokens: (state, action) => {
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
        },

        clearAuth: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.token = null;
            state.refreshToken = null;
            state.permissions = [];
            state.securityClearance = null;
            state.role = null;
            state.mfaRequired = false;
            state.mfaVerified = false;
        },

        setMfaRequired: (state, action) => {
            state.mfaRequired = action.payload;
        },

        setMfaVerified: (state, action) => {
            state.mfaVerified = action.payload;
        },

        setSessionExpiry: (state, action) => {
            state.sessionExpiry = action.payload;
        },

        updatePreferences: (state, action) => {
            state.preferences = {
                ...state.preferences,
                ...action.payload
            };
        },

        setError: (state, action) => {
            state.error = action.payload;
        },

        clearError: (state) => {
            state.error = null;
        },

        setLoading: (state, action) => {
            state.isLoading = action.payload;
        }
    },

    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;

                if (action.payload.mfaRequired) {
                    state.mfaRequired = true;
                    return;
                }

                const { user, token, refreshToken } = action.payload;
                state.user = user;
                state.token = token;
                state.refreshToken = refreshToken;
                state.isAuthenticated = true;
                state.permissions = user.role?.permissions || [];
                state.securityClearance = user.securityClearance;
                state.role = user.role?.name;
                state.lastLogin = new Date().toISOString();
                state.preferences = user.preferences || state.preferences;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Register
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Logout
            .addCase(logoutUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                return { ...initialState };
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Refresh Token
            .addCase(refreshToken.fulfilled, (state, action) => {
                state.token = action.payload.token;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(refreshToken.rejected, (state, action) => {
                state.error = action.payload;
                state.isAuthenticated = false;
                state.user = null;
            })

            // Get Current User
            .addCase(getCurrentUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getCurrentUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
                state.permissions = action.payload.role?.permissions || [];
                state.securityClearance = action.payload.securityClearance;
                state.role = action.payload.role?.name;
            })
            .addCase(getCurrentUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Change Password
            .addCase(changePassword.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(changePassword.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Verify MFA
            .addCase(verifyMfa.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(verifyMfa.fulfilled, (state, action) => {
                state.isLoading = false;
                state.mfaVerified = true;
                state.mfaRequired = false;

                const { user, token, refreshToken } = action.payload;
                state.user = user;
                state.token = token;
                state.refreshToken = refreshToken;
                state.isAuthenticated = true;
            })
            .addCase(verifyMfa.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Update Profile
            .addCase(updateUserProfile.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = { ...state.user, ...action.payload };
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Update Preferences
            .addCase(updatePreferences.fulfilled, (state, action) => {
                state.preferences = {
                    ...state.preferences,
                    ...action.payload
                };
            })

            // Enable/Disable MFA
            .addCase(enableMfa.fulfilled, (state) => {
                if (state.user) {
                    state.user.mfaEnabled = true;
                }
            })
            .addCase(disableMfa.fulfilled, (state) => {
                if (state.user) {
                    state.user.mfaEnabled = false;
                }
            });
    }
});

// Export actions
export const {
    setUser,
    setTokens,
    clearAuth,
    setMfaRequired,
    setMfaVerified,
    setSessionExpiry,
    setError,
    clearError,
    setLoading,
    updatePreferences: updatePreferencesAction
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectError = (state) => state.auth.error;
export const selectPermissions = (state) => state.auth.permissions;
export const selectSecurityClearance = (state) => state.auth.securityClearance;
export const selectRole = (state) => state.auth.role;
export const selectPreferences = (state) => state.auth.preferences;
export const selectMfaRequired = (state) => state.auth.mfaRequired;
export const selectMfaVerified = (state) => state.auth.mfaVerified;

// Memoized selectors
export const selectHasPermission = createSelector(
    [selectPermissions, selectRole],
    (permissions, role) => (permission) => {
        if (role === 'admin') return true;
        return permissions.includes(permission) || permissions.includes('*');
    }
);

export const selectHasClearance = createSelector(
    [selectSecurityClearance],
    (userClearance) => (requiredClearance) => {
        const levels = ['public', 'internal', 'confidential', 'restricted'];
        const userLevel = levels.indexOf(userClearance);
        const requiredLevel = levels.indexOf(requiredClearance);
        return userLevel >= requiredLevel;
    }
);

export default authSlice.reducer;