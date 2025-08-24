'use client'

import { useEffect, useRef, useState } from 'react';
import { 
  DocumentReference, 
  CollectionReference, 
  Query, 
  onSnapshot, 
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
  FirestoreError
} from 'firebase/firestore';

interface UseFirestoreListenerOptions {
  enabled?: boolean;
  onError?: (error: FirestoreError) => void;
}

interface UseDocumentListenerResult<T> {
  data: T | null;
  loading: boolean;
  error: FirestoreError | null;
  exists: boolean;
}

interface UseCollectionListenerResult<T> {
  data: T[];
  loading: boolean;
  error: FirestoreError | null;
  isEmpty: boolean;
}

/**
 * Hook for listening to a single Firestore document with automatic cleanup
 */
export function useDocumentListener<T = DocumentData>(
  ref: DocumentReference | null,
  options: UseFirestoreListenerOptions = {}
): UseDocumentListenerResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [exists, setExists] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const { enabled = true, onError } = options;

  useEffect(() => {
    // Cleanup previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state
    setLoading(true);
    setError(null);
    setData(null);
    setExists(false);

    // Don't start listener if disabled or no ref
    if (!enabled || !ref) {
      setLoading(false);
      return;
    }

    try {
      unsubscribeRef.current = onSnapshot(
        ref,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          setExists(snapshot.exists());
          
          if (snapshot.exists()) {
            const docData = { id: snapshot.id, ...snapshot.data() } as T;
            setData(docData);
          } else {
            setData(null);
          }
          
          setLoading(false);
          setError(null);
        },
        (firestoreError: FirestoreError) => {
          // Error handling removed
          setError(firestoreError);
          setLoading(false);
          
          if (onError) {
            onError(firestoreError);
          }
        }
      );
    } catch (err) {
      // Error handling removed
      setError(err as FirestoreError);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [ref, enabled, onError]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return { data, loading, error, exists };
}

/**
 * Hook for listening to a Firestore collection/query with automatic cleanup
 */
export function useCollectionListener<T = DocumentData>(
  ref: CollectionReference | Query | null,
  options: UseFirestoreListenerOptions = {}
): UseCollectionListenerResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  const { enabled = true, onError } = options;

  useEffect(() => {
    // Cleanup previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state
    setLoading(true);
    setError(null);
    setData([]);
    setIsEmpty(true);

    // Don't start listener if disabled or no ref
    if (!enabled || !ref) {
      setLoading(false);
      return;
    }

    try {
      unsubscribeRef.current = onSnapshot(
        ref,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          
          setData(docs);
          setIsEmpty(snapshot.empty);
          setLoading(false);
          setError(null);
        },
        (firestoreError: FirestoreError) => {
          // Error handling removed
          setError(firestoreError);
          setLoading(false);
          
          if (onError) {
            onError(firestoreError);
          }
        }
      );
    } catch (err) {
      // Error handling removed
      setError(err as FirestoreError);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [ref, enabled, onError]);

  // Additional cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return { data, loading, error, isEmpty };
}

/**
 * Hook for managing multiple Firestore listeners with batch cleanup
 */
export function useMultipleListeners() {
  const listenersRef = useRef<Map<string, () => void>>(new Map());

  const addListener = (key: string, unsubscribe: () => void) => {
    // Remove existing listener with same key
    const existing = listenersRef.current.get(key);
    if (existing) {
      existing();
    }
    
    // Add new listener
    listenersRef.current.set(key, unsubscribe);
  };

  const removeListener = (key: string) => {
    const unsubscribe = listenersRef.current.get(key);
    if (unsubscribe) {
      unsubscribe();
      listenersRef.current.delete(key);
    }
  };

  const clearAllListeners = () => {
    listenersRef.current.forEach((unsubscribe) => {
      unsubscribe();
    });
    listenersRef.current.clear();
  };

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      clearAllListeners();
    };
  }, []);

  return {
    addListener,
    removeListener,
    clearAllListeners
  };
}

/**
 * Hook for creating debounced Firestore listeners to reduce excessive updates
 */
// export function useDebouncedFirestoreListener<T = DocumentData>(
//   ref: DocumentReference | CollectionReference | Query | null,
//   delay: number = 500,
//   options: UseFirestoreListenerOptions = {}
// ) {
//   const [debouncedData, setDebouncedData] = useState<T | T[] | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<FirestoreError | null>(null);
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const unsubscribeRef = useRef<(() => void) | null>(null);
  
//   const { enabled = true, onError } = options;

//   useEffect(() => {
//     // Cleanup previous listener and timeout
//     if (unsubscribeRef.current) {
//       unsubscribeRef.current();
//       unsubscribeRef.current = null;
//     }
//     if (timeoutRef.current) {
//       clearTimeout(timeoutRef.current);
//       timeoutRef.current = null;
//     }

//     // Reset state
//     setLoading(true);
//     setError(null);

//     // Don't start listener if disabled or no ref
//     if (!enabled || !ref) {
//       setLoading(false);
//       return;
//     }

//     try {
//       unsubscribeRef.current = onSnapshot(
//         ref,
//         (snapshot) => {
//           // Clear existing timeout
//           if (timeoutRef.current) {
//             clearTimeout(timeoutRef.current);
//           }

//           // Set new timeout for debounced update
//           timeoutRef.current = setTimeout(() => {
//             if ('docs' in snapshot) {
//               // Collection/Query snapshot
//               const docs = snapshot.docs.map(doc => ({
//                 id: doc.id,
//                 ...doc.data()
//               })) as T[];
//               setDebouncedData(docs);
//             } else {
//               // Document snapshot
//               const docData = snapshot.exists() 
//                 ? { id: snapshot.id, ...snapshot.data() } as T
//                 : null;
//               setDebouncedData(docData);
//             }
            
//             setLoading(false);
//             setError(null);
//           }, delay);
//         },
//         (firestoreError: FirestoreError) => {
//           // Error handling removed
//           setError(firestoreError);
//           setLoading(false);
          
//           if (onError) {
//             onError(firestoreError);
//           }
//         }
//       );
//     } catch (err) {
//       // Error handling removed
//       setError(err as FirestoreError);
//       setLoading(false);
//     }

//     // Cleanup function
//     return () => {
//       if (unsubscribeRef.current) {
//         unsubscribeRef.current();
//         unsubscribeRef.current = null;
//       }
//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//         timeoutRef.current = null;
//       }
//     };
//   }, [ref, delay, enabled, onError]);

//   // Additional cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (unsubscribeRef.current) {
//         unsubscribeRef.current();
//       }
//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }
//     };
//   }, []);

//   return { data: debouncedData, loading, error };
// }