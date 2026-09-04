// src/services/mockData/initialCheckIns.ts
import { CheckInRecord, CheckInType } from '../../types';

export const initialCheckInTypes: CheckInType[] = [
  { id: 'type-1', name: '学习', symbol: '📖', colorHex: '#7ED9B7', sortOrder: 1, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'type-2', name: '运动', symbol: '🏃', colorHex: '#FF9A5A', sortOrder: 2, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'type-3', name: '散步', symbol: '🚶', colorHex: '#57B8E3', sortOrder: 3, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'type-4', name: '早起', symbol: '⏰', colorHex: '#FFD76A', sortOrder: 4, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'type-5', name: '冥想', symbol: '🧘', colorHex: '#B39DDB', sortOrder: 5, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'type-6', name: '喝水', symbol: '💧', colorHex: '#4AA8D8', sortOrder: 6, enabled: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

function dateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().split('T')[0];
}

export const initialCheckInRecords: CheckInRecord[] = [
  { id: 'chk-1', date: dateStr(0), typeId: 'type-1', typeName: '学习', symbol: '📖', createdAt: new Date().toISOString() },
  { id: 'chk-2', date: dateStr(0), typeId: 'type-4', typeName: '早起', symbol: '⏰', createdAt: new Date().toISOString() },
  { id: 'chk-3', date: dateStr(-1), typeId: 'type-1', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'chk-4', date: dateStr(-1), typeId: 'type-2', typeName: '运动', symbol: '🏃', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'chk-5', date: dateStr(-1), typeId: 'type-4', typeName: '早起', symbol: '⏰', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'chk-6', date: dateStr(-2), typeId: 'type-1', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'chk-7', date: dateStr(-2), typeId: 'type-3', typeName: '散步', symbol: '🚶', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'chk-8', date: dateStr(-3), typeId: 'type-1', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'chk-9', date: dateStr(-3), typeId: 'type-2', typeName: '运动', symbol: '🏃', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'chk-10', date: dateStr(-4), typeId: 'type-4', typeName: '早起', symbol: '⏰', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'chk-11', date: dateStr(-5), typeId: 'type-1', typeName: '学习', symbol: '📖', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];
