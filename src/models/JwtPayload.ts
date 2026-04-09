export interface IJwtPayload {
    id: string;
    fullName: string;
    email: string;
    roles: Array<'OWNER' | 'INTERESTED' | 'ADMIN'>;
}
