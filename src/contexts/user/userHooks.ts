/**
 * User Hooks
 * 
 * Custom React hooks for user-related functionality including
 * authentication, profile management, and privacy controls.
 */

import { useCallback, useEffect, useState } from 'react';
import { useUser } from './UserContext';
import { 
  User, 
  UserProfile, 
  LoginRequest, 
  RegisterRequest,
  UserSettings,
  PrivacySettings,
  UserError,
  UserErrorCode
} from './user.types';

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

/**
 * Hook for user authentication state and actions
 */
export const useAuth = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    error, 
    login, 
    register, 
    logout, 
    clearError 
  } = useUser();

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    const success = await login(credentials);
    return success;
  }, [login]);

  const handleRegister = useCallback(async (userData: RegisterRequest) => {
    const success = await register(userData);
    return success;
  }, [register]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError
  };
};

/**
 * Hook for login form state and validation
 */
export const useLoginForm = () => {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error, clearError } = useAuth();

  const handleChange = useCallback((field: keyof LoginRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    clearError();

    try {
      const success = await login(formData);
      if (success) {
        setFormData({ email: '', password: '' });
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, login, clearError]);

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    validateForm
  };
};

/**
 * Hook for registration form state and validation
 */
export const useRegisterForm = () => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: undefined,
    locationZip: '',
    locationCity: '',
    locationState: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, error, clearError } = useAuth();

  const handleChange = useCallback((field: keyof RegisterRequest, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    clearError();

    try {
      const success = await register(formData);
      if (success) {
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          phone: '',
          dateOfBirth: undefined,
          locationZip: '',
          locationCity: '',
          locationState: ''
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, register, clearError]);

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    validateForm
  };
};

// ============================================================================
// PROFILE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for user profile management
 */
export const useProfile = () => {
  const { user, updateProfile, isLoading, error } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateUserProfile = useCallback(async (updates: Partial<User>) => {
    setIsUpdating(true);
    try {
      const success = await updateProfile(updates);
      return success;
    } finally {
      setIsUpdating(false);
    }
  }, [updateProfile]);

  return {
    user,
    updateProfile: updateUserProfile,
    isLoading: isLoading || isUpdating,
    error
  };
};

/**
 * Hook for user settings management
 */
export const useSettings = () => {
  const { updateSettings, isLoading, error } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateUserSettings = useCallback(async (settings: Partial<UserSettings>) => {
    setIsUpdating(true);
    try {
      const success = await updateSettings(settings);
      return success;
    } finally {
      setIsUpdating(false);
    }
  }, [updateSettings]);

  return {
    updateSettings: updateUserSettings,
    isLoading: isLoading || isUpdating,
    error
  };
};

/**
 * Hook for privacy settings management
 */
export const usePrivacy = () => {
  const { updatePrivacy, isLoading, error } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePrivacySettings = useCallback(async (privacy: Partial<PrivacySettings>) => {
    setIsUpdating(true);
    try {
      const success = await updatePrivacy(privacy);
      return success;
    } finally {
      setIsUpdating(false);
    }
  }, [updatePrivacy]);

  return {
    updatePrivacy: updatePrivacySettings,
    isLoading: isLoading || isUpdating,
    error
  };
};

// ============================================================================
// DISPLAY NAME HOOKS
// ============================================================================

/**
 * Hook for display name management
 */
export const useDisplayName = () => {
  const { user, regenerateDisplayName, checkDisplayNameAvailability } = useUser();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    try {
      const success = await regenerateDisplayName();
      return success;
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateDisplayName]);

  const checkAvailability = useCallback(async (displayName: string) => {
    setIsChecking(true);
    try {
      const available = await checkDisplayNameAvailability(displayName);
      return available;
    } finally {
      setIsChecking(false);
    }
  }, [checkDisplayNameAvailability]);

  const canRegenerate = user ? 
    new Date() >= new Date(user.displayNameRegenerationAvailableAt) : false;

  return {
    displayName: user?.displayName,
    canRegenerate,
    isRegenerating,
    isChecking,
    regenerate: handleRegenerate,
    checkAvailability
  };
};

// ============================================================================
// VERIFICATION HOOKS
// ============================================================================

/**
 * Hook for user verification
 */
export const useVerification = () => {
  const { user, submitVerification, checkVerificationStatus } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmitVerification = useCallback(async (documents: any) => {
    setIsSubmitting(true);
    try {
      const success = await submitVerification(documents);
      return success;
    } finally {
      setIsSubmitting(false);
    }
  }, [submitVerification]);

  const handleCheckStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const success = await checkVerificationStatus();
      return success;
    } finally {
      setIsChecking(false);
    }
  }, [checkVerificationStatus]);

  return {
    verificationStatus: user?.verificationStatus,
    verificationBadge: user?.verificationBadge,
    isSubmitting,
    isChecking,
    submitVerification: handleSubmitVerification,
    checkStatus: handleCheckStatus
  };
};

// ============================================================================
// PRIVACY HOOKS
// ============================================================================

/**
 * Hook for public profile access
 */
export const usePublicProfile = (userId: string) => {
  const { getPublicProfile } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UserError | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userProfile = await getPublicProfile(userId);
      setProfile(userProfile);
    } catch (err) {
      setError(err as UserError);
    } finally {
      setIsLoading(false);
    }
  }, [userId, getPublicProfile]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, loadProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: loadProfile
  };
};

/**
 * Hook for trade identity access
 */
export const useTradeIdentity = (tradeId: string) => {
  const { getIdentityForTrade } = useUser();
  const [identity, setIdentity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UserError | null>(null);

  const loadIdentity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tradeIdentity = await getIdentityForTrade(tradeId);
      setIdentity(tradeIdentity);
    } catch (err) {
      setError(err as UserError);
    } finally {
      setIsLoading(false);
    }
  }, [tradeId, getIdentityForTrade]);

  useEffect(() => {
    if (tradeId) {
      loadIdentity();
    }
  }, [tradeId, loadIdentity]);

  return {
    identity,
    isLoading,
    error,
    refetch: loadIdentity
  };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for user session management
 */
export const useSession = () => {
  const { user, isAuthenticated, refreshUser } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    // Auto-refresh user data every 5 minutes
    const interval = setInterval(() => {
      if (isAuthenticated) {
        refresh();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refresh]);

  return {
    user,
    isAuthenticated,
    isRefreshing,
    refresh
  };
};

/**
 * Hook for user error handling
 */
export const useUserError = () => {
  const { error, clearError } = useUser();
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('');
    }
  }, [error]);

  const handleClearError = useCallback(() => {
    clearError();
    setErrorMessage('');
  }, [clearError]);

  return {
    error,
    errorMessage,
    clearError: handleClearError
  };
};

// ============================================================================
// EXPORTS
// ============================================================================
// All hooks are already exported individually above
