interface UserRecord {
    uid: string;
    email?: string;
    displayName?: string;
}
interface CreateUserResult {
    result: 'SUCCESS' | 'FAILURE';
    userData?: unknown;
    error?: string;
}
declare const createUser: (userRecord: UserRecord) => Promise<CreateUserResult>;
export default createUser;
//# sourceMappingURL=create-user.d.ts.map