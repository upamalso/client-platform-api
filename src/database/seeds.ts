import { Pool } from 'mysql2/promise';
import { Tenant } from '../config';

type MenuItem = readonly [string, string, number, number];
const lashMenu: readonly MenuItem[] = [
  ['classic-full', 'Classic Full Set', 105, 95],
  ['hybrid-full', 'Hybrid Full Set', 120, 110],
  ['volume-full', 'Natural Volume (2-3D)', 120, 120],
  ['glam-volume-full', 'Glam Volume (4-6D)', 135, 135],
  ['mega-volume-full', 'Mega Volume (9D+)', 150, 150],
  ['classic-infill', 'Classic Infill', 45, 50],
  ['hybrid-infill', 'Hybrid Infill', 60, 55],
  ['volume-infill', 'Volume Infill', 60, 60],
  ['mega-infill', 'Mega Volume Infill', 75, 75],
  ['lvl-lift', 'LVL Lash Lift & Tint', 55, 75],
  ['brow-lamination', 'Brow Lamination & Tint', 45, 45],
  ['lash-removal', 'Lash Removal', 30, 25],
  ['patch-test', 'Patch Test', 15, 0],
];
const glowMenu: readonly MenuItem[] = [
  lashMenu[0], lashMenu[1],
  ['glow-facial', 'Signature Glow Facial', 60, 60],
  ['express-facial', 'Express Skin Refresh', 30, 35],
  ['gel-manicure', 'Gel Manicure', 45, 35],
  lashMenu[5],
  ['brow-shape', 'Brow Shape & Tint', 30, 25],
  ['half-leg-wax', 'Half Leg Wax', 30, 25],
  ['underarm-wax', 'Underarm Wax', 15, 15],
  ['lvl-lift', 'Lash Lift & Tint', 55, 75], lashMenu[10],
  ['classic-pedicure', 'Classic Pedicure', 45, 40], lashMenu[12],
];

export async function seedTenant(pool: Pool, tenant: Tenant): Promise<void> {
  const menu = tenant.id === 'ana-glow' ? glowMenu : lashMenu;
  const publicInfo = {
    name: tenant.name, timezone: tenant.timezone, currency: 'GBP', demo: true,
    phone: '+44 20 7946 0000', email: `hello@${tenant.id}.example`,
    addressLines: ['123 Example Street', 'Sample Town', 'UK AB1 2CD'],
    schedule: {
      '1': null, '2': [570, 1170], '3': [570, 1170], '4': [570, 1170],
      '5': [570, 1170], '6': [540, 1080], '7': [600, 960],
    },
  };
  await pool.execute('INSERT IGNORE INTO business (id, public_info) VALUES (1, ?)', [JSON.stringify(publicInfo)]);
  await pool.execute('INSERT IGNORE INTO resources (id, name) VALUES (?, ?)', ['studio', 'Studio appointments']);
  for (const [id, name, duration, price] of menu) {
    await pool.execute(`INSERT IGNORE INTO services
      (id, name, duration_minutes, price_pence, resource_id) VALUES (?, ?, ?, ?, 'studio')`,
    [id, name, duration, Math.round(price * 100)]);
  }
}