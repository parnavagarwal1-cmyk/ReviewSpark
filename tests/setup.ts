// Test environment setup — mock environment variables needed by server-side modules

process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.ADMIN_PASSWORD_HASH = '$2b$12$mockhashmockhashmockha.mockhashmockhashmo.CuH2';
process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.GOOGLE_PLACES_API_KEY = 'mock-google-key';
process.env.IP_HASH_SECRET = 'test-secret';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
