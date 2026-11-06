import { handleProviders } from '../../server/aiGateway.js';

export default function handler(req, res) {
  return handleProviders(req, res);
}
