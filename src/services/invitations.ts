/**
 * Invitation Service
 *
 * Handles all invitation-related API calls including creating invitations,
 * validating tokens, accepting invitations, and managing pending invitations.
 */

import { apiGet, apiPost, apiDelete, handleResponse } from './api-client'

const API_BASE_URL = '/api/invitations'

export interface Invitation {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'expired' | 'declined' | 'cancelled'
  inviterName: string
  tenantName: string
  createdAt: string
  expiresAt: string
}

export interface InvitationInfo {
  email: string
  tenantName: string
  inviterName: string
  expiresAt: string
}

export interface AcceptInvitationData {
  firstName: string
  lastName: string
  password: string
}

export interface CreateInvitationResponse {
  data: {
    id: string
    email: string
  }
}

export interface InvitationListResponse {
  data: Invitation[]
}

export interface InvitationInfoResponse {
  data: InvitationInfo
}

/**
 * Backend validation response structure
 * When valid is false, other fields are not present
 */
interface ValidateInvitationApiResponse {
  data: {
    valid: boolean
    email?: string
    tenantName?: string
    inviterName?: string
    expiresAt?: string
  }
}

/**
 * Create a new invitation for a user to join the tenant
 */
export async function createInvitation(email: string): Promise<void> {
  await apiPost<CreateInvitationResponse>(API_BASE_URL, { email })
}

/**
 * Validate an invitation token and get invitation details
 * This is a public endpoint that does not require authentication
 *
 * @param token - The invitation token to validate
 * @param signal - Optional AbortSignal for request cancellation
 * @throws Error if invitation is invalid or expired
 */
export async function validateInvitation(
  token: string,
  signal?: AbortSignal
): Promise<InvitationInfo> {
  const response = await fetch(`${API_BASE_URL}/${token}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  })
  const result = await handleResponse<ValidateInvitationApiResponse>(response)

  // Backend returns { valid: boolean, ...details }
  // When valid is false, throw an error as the invitation cannot be used
  if (!result.data.valid) {
    throw new Error('This invitation is invalid or has expired')
  }

  // Extract invitation info from validated response
  return {
    email: result.data.email!,
    tenantName: result.data.tenantName!,
    inviterName: result.data.inviterName!,
    expiresAt: result.data.expiresAt!,
  }
}

/**
 * Accept an invitation and create user account
 * This is a public endpoint that does not require authentication
 */
export async function acceptInvitation(
  token: string,
  data: AcceptInvitationData
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${token}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  await handleResponse<{ data: { message: string } }>(response)
}

/**
 * Decline an invitation
 * This is a public endpoint that does not require authentication
 */
export async function declineInvitation(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${token}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  await handleResponse<{ data: { message: string } }>(response)
}

/**
 * Resend an invitation email
 */
export async function resendInvitation(email: string): Promise<void> {
  await apiPost(`${API_BASE_URL}/resend`, { email })
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  await apiDelete(`${API_BASE_URL}/${invitationId}`)
}

/**
 * Get all invitations for the current tenant
 */
export async function getInvitations(): Promise<Invitation[]> {
  const result = await apiGet<InvitationListResponse>(API_BASE_URL)
  return result.data
}

export const invitationService = {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  declineInvitation,
  resendInvitation,
  cancelInvitation,
  getInvitations,
}
