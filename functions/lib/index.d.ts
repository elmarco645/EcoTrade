export declare const api: import("firebase-functions/v2/https").HttpsFunction;
export declare const onUserCreated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    userId: string;
}>>;
export declare const scheduled: import("firebase-functions/v2/scheduler").ScheduleFunction;
