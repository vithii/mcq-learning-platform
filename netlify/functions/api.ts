import serverless from 'serverless-http';
import { app, ensureDatabaseInitialized } from '../../server/src/app';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  await ensureDatabaseInitialized();
  return serverlessHandler(event, context);
};
