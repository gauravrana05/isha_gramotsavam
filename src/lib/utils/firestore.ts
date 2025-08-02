/**
 * Utility functions for serializing Firestore data for Client Components
 */

export function serializeFirestoreData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(serializeFirestoreData);
  }

  if (typeof data === 'object') {
    // Handle Firestore Timestamp objects
    if (data._seconds !== undefined && data._nanoseconds !== undefined) {
      const date = new Date(data._seconds * 1000 + data._nanoseconds / 1000000);
      return date.toISOString();
    }

    // Handle regular Firestore Timestamp objects with toDate method
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString();
    }

    // Recursively serialize nested objects
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeFirestoreData(value);
    }
    return serialized;
  }

  return data;
}

export function serializeFirestoreDoc(doc: any) {
  const data = doc.data();
  return {
    id: doc.id,
    ...serializeFirestoreData(data),
  };
}

export function serializeFirestoreDocs(docs: any[]) {
  return docs.map(serializeFirestoreDoc);
}