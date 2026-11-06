import { handleSession } from '../../server/aiGateway.js';

export default async function handler(req, res) {
  return handleSession(req, res);
}
