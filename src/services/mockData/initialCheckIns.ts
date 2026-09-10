// src/services/mockData/initialCheckIns.ts
import { CheckInRecord, CheckInType } from '../../types';

export const initialCheckInTypes: CheckInType[] = [
  { id: '00000000-0000-4000-8000-000000000001', name: '学习', symbol: '📖', colorHex: '#7ED9B7', sortOrder: 1, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '00000000-0000-4000-8000-000000000002', name: '运动', symbol: '🏃', colorHex: '#FF9A5A', sortOrder: 2, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '00000000-0000-4000-8000-000000000003', name: '散步', symbol: '🚶', colorHex: '#57B8E3', sortOrder: 3, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '00000000-0000-4000-8000-000000000004', name: '早起', symbol: '⏰', colorHex: '#FFD76A', sortOrder: 4, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '00000000-0000-4000-8000-000000000005', name: '冥想', symbol: '🧘', colorHex: '#B39DDB', sortOrder: 5, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '00000000-0000-4000-8000-000000000006', name: '喝水', symbol: '💧', colorHex: '#4AA8D8', sortOrder: 6, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

function dateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const initialCheckInRecords: CheckInRecord[] = [
  { id: 'c0000000-0000-4000-8000-000000000001', date: dateStr(0), typeId: '00000000-0000-4000-8000-000000000001', typeName: '学习', symbol: '📖', createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000002', date: dateStr(0), typeId: '00000000-0000-4000-8000-000000000004', typeName: '早起', symbol: '⏰', createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000003', date: dateStr(-1), typeId: '00000000-0000-4000-8000-000000000001', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000004', date: dateStr(-1), typeId: '00000000-0000-4000-8000-000000000002', typeName: '运动', symbol: '🏃', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000005', date: dateStr(-1), typeId: '00000000-0000-4000-8000-000000000004', typeName: '早起', symbol: '⏰', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000006', date: dateStr(-2), typeId: '00000000-0000-4000-8000-000000000001', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000007', date: dateStr(-2), typeId: '00000000-0000-4000-8000-000000000003', typeName: '散步', symbol: '🚶', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000008', date: dateStr(-3), typeId: '00000000-0000-4000-8000-000000000001', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000009', date: dateStr(-3), typeId: '00000000-0000-4000-8000-000000000002', typeName: '运动', symbol: '🏃', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000010', date: dateStr(-4), typeId: '00000000-0000-4000-8000-000000000004', typeName: '早起', symbol: '⏰', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'c0000000-0000-4000-8000-000000000011', date: dateStr(-5), typeId: '00000000-0000-4000-8000-000000000001', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];
