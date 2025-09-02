import { createTRPCRouter } from '../../trpc';
import { captainMatchRouter } from './match';

export const captainRouter = createTRPCRouter({
  match: captainMatchRouter,
});