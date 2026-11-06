import { handleAIChat } from '../../server/aiGateway.js';

export default async function handler(req, res) {
  return handleAIChat(req, res);
}
