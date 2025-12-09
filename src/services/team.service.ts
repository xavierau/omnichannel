/**
 * Team Service
 *
 * Handles all team-related API calls including CRUD operations,
 * member management, and channel account assignments.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api-client'
import type { ApiResponse } from './api-client'

const API_BASE_URL = '/api/teams'

// ============================================================================
// Types
// ============================================================================

export const TeamMemberRole = {
  LEADER: 'leader',
  MEMBER: 'member',
} as const

export type TeamMemberRole = (typeof TeamMemberRole)[keyof typeof TeamMemberRole]

export interface Team {
  id: string
  name: string
  description: string | null
  isActive: boolean
  memberCount: number
  channelAccountCount: number
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: TeamMemberRole
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

export interface TeamChannelAccount {
  id: string
  teamId: string
  channelAccountId: string
  channelAccount: {
    id: string
    name: string
    channelCode: string
    status: string
  }
  createdAt: string
}

export interface CreateTeamData {
  name: string
  description?: string
}

export interface UpdateTeamData {
  name?: string
  description?: string
  isActive?: boolean
}

// ============================================================================
// Service
// ============================================================================

export const teamService = {
  /**
   * Get all teams for the current tenant
   */
  async getTeams(): Promise<Team[]> {
    const response = await apiGet<ApiResponse<Team[]>>(API_BASE_URL)
    return response.data
  },

  /**
   * Get a single team by ID
   */
  async getTeam(id: string): Promise<Team> {
    const response = await apiGet<ApiResponse<Team>>(`${API_BASE_URL}/${id}`)
    return response.data
  },

  /**
   * Create a new team
   */
  async createTeam(data: CreateTeamData): Promise<Team> {
    const response = await apiPost<ApiResponse<Team>, CreateTeamData>(
      API_BASE_URL,
      data
    )
    return response.data
  },

  /**
   * Update an existing team
   */
  async updateTeam(id: string, data: UpdateTeamData): Promise<Team> {
    const response = await apiPatch<ApiResponse<Team>, UpdateTeamData>(
      `${API_BASE_URL}/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a team
   */
  async deleteTeam(id: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${id}`)
  },

  /**
   * Get all members of a team
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const response = await apiGet<ApiResponse<TeamMember[]>>(
      `${API_BASE_URL}/${teamId}/members`
    )
    return response.data
  },

  /**
   * Add a member to a team
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    role?: TeamMemberRole
  ): Promise<TeamMember> {
    const response = await apiPost<
      ApiResponse<TeamMember>,
      { userId: string; role?: TeamMemberRole }
    >(`${API_BASE_URL}/${teamId}/members`, { userId, role })
    return response.data
  },

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/${teamId}/members/${userId}`)
  },

  /**
   * Update a member's role in a team
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    role: TeamMemberRole
  ): Promise<TeamMember> {
    const response = await apiPatch<
      ApiResponse<TeamMember>,
      { role: TeamMemberRole }
    >(`${API_BASE_URL}/${teamId}/members/${userId}/role`, { role })
    return response.data
  },

  /**
   * Get all channel accounts assigned to a team
   */
  async getTeamChannelAccounts(teamId: string): Promise<TeamChannelAccount[]> {
    const response = await apiGet<ApiResponse<TeamChannelAccount[]>>(
      `${API_BASE_URL}/${teamId}/channel-accounts`
    )
    return response.data
  },

  /**
   * Add a channel account to a team
   */
  async addTeamChannelAccount(
    teamId: string,
    channelAccountId: string
  ): Promise<TeamChannelAccount> {
    const response = await apiPost<
      ApiResponse<TeamChannelAccount>,
      { channelAccountId: string }
    >(`${API_BASE_URL}/${teamId}/channel-accounts`, { channelAccountId })
    return response.data
  },

  /**
   * Remove a channel account from a team
   */
  async removeTeamChannelAccount(
    teamId: string,
    channelAccountId: string
  ): Promise<void> {
    await apiDelete(
      `${API_BASE_URL}/${teamId}/channel-accounts/${channelAccountId}`
    )
  },
}
