export default () => ({
    port: parseInt(process.env.PORT || '4040', 10),
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
    },
    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    },
    ai: {
        // Switch the AI model any time by changing AI_MODEL in .env
        // Supported: 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', etc.
        model: process.env.AI_MODEL || 'gemini-1.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
    },
});