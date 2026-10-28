import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function localApiPlugin(): Plugin {
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/google/sync-proposal')) {
          try {
            const { default: handler } = await server.ssrLoadModule('/api/google/sync-proposal.ts');

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                (req as any).body = body ? JSON.parse(body) : {};
              } catch {
                (req as any).body = {};
              }

              const vercelRes: any = res;
              vercelRes.status = (code: number) => {
                res.statusCode = code;
                return vercelRes;
              };
              vercelRes.json = (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return vercelRes;
              };
              vercelRes.send = (data: any) => {
                res.end(data);
                return vercelRes;
              };

              await handler(req as any, vercelRes);
            });
            return;
          } catch (err: any) {
            console.error('Local API Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
});

