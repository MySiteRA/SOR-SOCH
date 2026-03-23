import { useState, useEffect, useCallback, useRef } from 'react';
import { avatarPreloader } from '../services/avatarPreloader';

interface UseAvatarPreloaderReturn {
  getAvatar: (studentId: string) => string | null;
  preloadAvatars: (studentIds: string[]) => Promise<void>;
  isLoading: boolean;
}

export function useAvatarPreloader(): UseAvatarPreloaderReturn {
  const [avatarMap, setAvatarMap] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const avatarMapRef = useRef(avatarMap);
  avatarMapRef.current = avatarMap;

  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { studentId, avatarUrl } = event.detail;
      setAvatarMap(prev => new Map(prev.set(studentId, avatarUrl)));
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  const getAvatar = useCallback((studentId: string): string | null => {
    // Check local state via ref (doesn't cause re-render)
    if (avatarMapRef.current.has(studentId)) {
      return avatarMapRef.current.get(studentId) || null;
    }

    // Check cache
    const cachedAvatar = avatarPreloader.getCachedAvatar(studentId);
    if (cachedAvatar !== null) {
      return cachedAvatar;
    }

    // Start background load
    avatarPreloader.loadStudentAvatar(studentId).catch(console.error);
    
    return null;
  }, []);

  const preloadAvatars = useCallback(async (studentIds: string[]): Promise<void> => {
    if (studentIds.length === 0) return;

    setIsLoading(true);
    
    try {
      // Load from cache first
      const initialAvatars = new Map<string, string | null>();
      studentIds.forEach(studentId => {
        const cached = avatarPreloader.getCachedAvatar(studentId);
        if (cached !== null) {
          initialAvatars.set(studentId, cached);
        }
      });

      if (initialAvatars.size > 0) {
        setAvatarMap(prev => {
          const newMap = new Map(prev);
          initialAvatars.forEach((avatarUrl, studentId) => {
            newMap.set(studentId, avatarUrl);
          });
          return newMap;
        });
      }

      // Start background loading
      await avatarPreloader.preloadAvatars(studentIds);
    } catch (error) {
      console.error('Error preloading avatars:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getAvatar,
    preloadAvatars,
    isLoading
  };
}