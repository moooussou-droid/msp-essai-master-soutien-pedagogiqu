import { handlePrepFicheSync } from '../../server/aiGateway.js';

export default async function handler(req, res) {
  return handlePrepFicheSync(req, res);
}
