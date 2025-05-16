import { useState, useEffect, useCallback } from 'react';

/**
 * A custom React hook to manage state synchronized with the browser's local storage.
 *
 * @template T The type of the value to be stored.
 * @param {string} key The key under which the value is stored in local storage.
 * @param {T | (() => T)} initialValue The initial value to use if no value is found in local storage.
 *                                      Can be a value or a function for lazy initialization.
 * @returns {[T, (value: T | ((val: T) => T)) => void]} A stateful value and a function to update it.
 */
function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check for localStorage availability (SSR and browser)
    if (typeof window === 'undefined') {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
    } catch (error) {
      // If error parsing, or any other localStorage error, log it and fall back to initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
    }

    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  // Update localStorage when storedValue changes
  useEffect(() => {
    // Check for localStorage availability
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = storedValue;
      if (valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // If error setting, or any other localStorage error, log it
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToSet = value instanceof Function ? value(storedValue) : value;
        // Save state
        setStoredValue(valueToSet);
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.error(`Error setting value for key "${key}":`, error);
      }
    },
    [key, storedValue, setStoredValue]
  );

  return [storedValue, setValue];
}

export default useLocalStorage;
