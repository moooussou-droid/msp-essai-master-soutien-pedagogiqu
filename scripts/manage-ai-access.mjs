#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';

const [command, ...args] = process.argv.slice(2);
const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function usage() {
  console.log(`
Gestion locale des codes IA MSP (la clé service-role ne quitte jamais votre terminal).

  npm run ai:access -- issue "Nom ou équipe" principal|team [jours=365] [requêtes/jour=25]
  npm run ai:access -- revoke CODE_IA
  npm run ai:access -- list

Variables requises : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
Le code complet n'est affiché qu'une seule fois; le serveur ne conserve que son SHA-256.
`);
}

if (!supabaseUrl || !serviceKey) {
  console.error('Configuration manquante : définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans votre terminal.');
  process.exit(2);
}

async function db(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const status = response.status;
    await response.body?.cancel().catch(() => {});
    throw new Error(`Supabase a répondu ${status}. Vérifiez la migration et les variables serveur.`);
  }
  if (response.status === 204) return null;
  return response.json();
}

const hash = (code) => createHash('sha256').update(code, 'utf8').digest('hex');

try {
  if (command === 'issue') {
    const [displayName, role, daysArg = '365', dailyArg = '25'] = args;
    const days = Number(daysArg);
    const dailyLimit = Number(dailyArg);
    if (!displayName?.trim() || !['principal', 'team'].includes(role) || !Number.isInteger(days) || days < 1 || days > 3650 || !Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 1000) {
      usage();
      process.exit(2);
    }
    const code = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    await db('msp_ai_access_tokens', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ token_hash: hash(code), display_name: displayName.trim().slice(0, 120), role, is_active: true, expires_at: expiresAt, daily_limit: dailyLimit }]),
    });
    console.log('\nCode IA créé — copiez-le et transmettez-le en privé; il ne pourra pas être réaffiché :\n');
    console.log(code);
    console.log(`\nProfil : ${displayName.trim()} · ${role} · expire le ${expiresAt.slice(0, 10)} · ${dailyLimit} requêtes/jour`);
    console.log('Le code d’accès IA est distinct du code hors-ligne de l’application.');
  } else if (command === 'revoke') {
    const code = String(args[0] || '').trim();
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(code)) {
      console.error('Indiquez le code IA complet à révoquer.');
      process.exit(2);
    }
    const query = new URLSearchParams({ token_hash: `eq.${hash(code)}` });
    const rows = await db(`msp_ai_access_tokens?${query.toString()}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ is_active: false }),
    });
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('Aucun code actif correspondant n’a été trouvé.');
      process.exit(1);
    }
    console.log(`Code IA révoqué pour ${rows[0].display_name} (${rows[0].role}).`);
  } else if (command === 'list') {
    const query = new URLSearchParams({ select: 'display_name,role,is_active,created_at,expires_at,last_seen_at,daily_limit', order: 'created_at.desc' });
    const rows = await db(`msp_ai_access_tokens?${query.toString()}`);
    if (!rows.length) console.log('Aucun code IA enregistré.');
    else for (const row of rows) {
      console.log(`${row.is_active ? 'ACTIF' : 'RÉVOQUÉ'}\t${row.role}\t${row.display_name}\texpire=${row.expires_at}\tquota/j=${row.daily_limit}\tvu=${row.last_seen_at || 'jamais'}`);
    }
  } else {
    usage();
    process.exit(command ? 2 : 0);
  }
} catch (error) {
  console.error(error?.message || 'Erreur de gestion du code IA.');
  process.exit(1);
}
