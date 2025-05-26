import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';

export const useSuggestions = (initialValue = '') => {
    const [searchTerm, setSearchTerm] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef(null);
    const debounceTimerRef = useRef(null);

    const fetchSuggestions = useCallback(async (term) => {
        if (!term) {
            setSuggestions([]);
            return;
        }

        try {
            setIsLoading(true);

            // Abort previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController();

            const response = await apiFetch(`/taxonomy/search?q=${encodeURIComponent(term)}`, {
                signal: abortControllerRef.current.signal,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.results || []);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching suggestions:', error);
                setSuggestions([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const debouncedFetch = useCallback((term) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            fetchSuggestions(term);
        }, 300); // 300ms delay
    }, [fetchSuggestions]);

    useEffect(() => {
        debouncedFetch(searchTerm);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [searchTerm, debouncedFetch]);

    return {
        searchTerm,
        setSearchTerm,
        suggestions,
        isLoading
    };
}; 