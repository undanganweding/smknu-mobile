/**
 * Guru Offline - Room Master Service
 * Handles Rooms, Labs, and Workshops
 */

import { repositories } from '../../repositories'
import type { RoomEntity, RoomType, AccountStatus } from '../../types'

export interface CreateRoomDTO {
  code: string
  name: string
  type: RoomType
  capacity?: number
  status?: AccountStatus
}

export type UpdateRoomDTO = Partial<CreateRoomDTO>

export class RoomService {
  async getAllRooms(status?: AccountStatus): Promise<RoomEntity[]> {
    const list = await repositories.rooms.findAll()
    if (status) {
      return list.filter((r) => r.status === status)
    }
    return list
  }

  async getRoomById(id: string): Promise<RoomEntity | null> {
    return await repositories.rooms.findById(id)
  }

  async searchRooms(
    query?: string,
    type?: RoomType,
    status?: AccountStatus
  ): Promise<RoomEntity[]> {
    let list = await this.getAllRooms(status)

    if (type) {
      list = list.filter((r) => r.type === type)
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      )
    }

    return list
  }

  async createRoom(data: CreateRoomDTO): Promise<RoomEntity> {
    if (!data.code || data.code.trim().length === 0) {
      throw new Error('Kode ruang wajib diisi.')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nama ruang wajib diisi.')
    }

    const cleanCode = data.code.trim().toUpperCase()
    const existing = await repositories.rooms.findByCode(cleanCode)
    if (existing) {
      throw new Error(`Kode ruang "${cleanCode}" sudah digunakan oleh ${existing.name}.`)
    }

    const now = new Date().toISOString()
    const newRoom: RoomEntity = {
      id: `rm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: cleanCode,
      name: data.name.trim(),
      type: data.type || 'THEORY',
      capacity: data.capacity !== undefined ? Number(data.capacity) : 36,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    return await repositories.rooms.create(newRoom)
  }

  async updateRoom(id: string, updates: UpdateRoomDTO): Promise<RoomEntity> {
    const existing = await repositories.rooms.findById(id)
    if (!existing) {
      throw new Error('Data ruang tidak ditemukan.')
    }

    if (updates.code && updates.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = updates.code.trim().toUpperCase()
      const dup = await repositories.rooms.findByCode(cleanCode)
      if (dup && dup.id !== id) {
        throw new Error(`Kode ruang "${cleanCode}" sudah digunakan oleh ${dup.name}.`)
      }
      updates.code = cleanCode
    }

    const cleanUpdates: Partial<RoomEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await repositories.rooms.update(id, cleanUpdates)
  }

  async toggleRoomStatus(id: string): Promise<RoomEntity> {
    const existing = await repositories.rooms.findById(id)
    if (!existing) {
      throw new Error('Data ruang tidak ditemukan.')
    }

    const newStatus: AccountStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    return await repositories.rooms.update(id, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })
  }
}

export const roomService = new RoomService()
