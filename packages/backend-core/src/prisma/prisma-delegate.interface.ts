export interface PrismaDelegate<T, CreateArgs, UpdateArgs> {
    findMany(args?: any): Promise<T[]>;
    findUnique(args?: any): Promise<T | null>;
    create(args: CreateArgs): Promise<T>;
    update(args: UpdateArgs): Promise<T>;
    delete(args: any): Promise<T>;
    count(args?: any): Promise<number>;
}