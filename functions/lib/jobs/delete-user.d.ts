interface UserRecord {
    uid: string;
}
interface DeleteUserResult {
    result: 'SUCCESS' | 'FAILURE';
    error?: string;
}
declare const deleteUser: (userRecord: UserRecord) => Promise<DeleteUserResult>;
export default deleteUser;
//# sourceMappingURL=delete-user.d.ts.map