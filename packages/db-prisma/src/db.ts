import { execSync } from 'child_process';

/**
 * Checks if the database exists; if not, creates it.
 * This works for common relational DBs handled by Prisma, such as PostgreSQL and MySQL.
 * Relies on env vars (DATABASE_URL) set in the environment.
 */
export async function ensureDbExists() {
    // Check the DB type from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL env variable not set');
    }

    // Prisma has a built-in command to create the DB if it doesn't exist
    // equivalent to: `npx prisma db push --skip-generate`
    try {
        execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
        // This will create the db if it does not exist
    } catch (e: any) {
        throw new Error(`Failed to ensure database exists: ${e.message}`);
    }
}
