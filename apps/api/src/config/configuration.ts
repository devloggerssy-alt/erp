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
        // Provider + model are read per chat request; the API boots without them.
        provider: process.env.AI_PROVIDER || 'openai',
        model: process.env.AI_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
    },
    storage: {
        type: process.env.STORAGE_TYPE || 'local',
    },
});