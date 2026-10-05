import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({ PUBLIC__POCKETBASE_URL: { public: true, static: true } });
