import type {
  CustomFieldDefinition,
  CustomFieldEntityType,
} from "@/types/custom-fields"

// ============================================
// Mock Custom Field Definitions
// ============================================

const mockTenantId = "tenant-001"

export const mockCustomerFields: CustomFieldDefinition[] = [
  {
    id: "cf-cust-001",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "company_name",
    displayLabel: "Company Name",
    description: "The company or organization the customer belongs to",
    fieldType: "TEXT",
    validation: {
      required: false,
      maxLength: 100,
    },
    displayOrder: 1,
    isVisible: true,
    isSearchable: true,
    isFilterable: false,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "cf-cust-002",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "annual_revenue",
    displayLabel: "Annual Revenue",
    description: "Customer's estimated annual revenue in USD",
    fieldType: "NUMBER",
    validation: {
      required: false,
      min: 0,
      decimal: true,
      precision: 2,
    },
    displayOrder: 2,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "cf-cust-003",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "industry",
    displayLabel: "Industry",
    description: "The industry sector of the customer",
    fieldType: "SELECT",
    validation: {
      required: false,
    },
    options: [
      { id: "opt-1", label: "Technology", value: "technology", order: 1 },
      { id: "opt-2", label: "Healthcare", value: "healthcare", order: 2 },
      { id: "opt-3", label: "Finance", value: "finance", order: 3 },
      { id: "opt-4", label: "Retail", value: "retail", order: 4 },
      { id: "opt-5", label: "Manufacturing", value: "manufacturing", order: 5 },
      { id: "opt-6", label: "Education", value: "education", order: 6 },
      { id: "opt-7", label: "Other", value: "other", order: 7 },
    ],
    displayOrder: 3,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "cf-cust-004",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "is_enterprise",
    displayLabel: "Enterprise Customer",
    description: "Whether this is an enterprise-level customer",
    fieldType: "BOOLEAN",
    validation: {},
    defaultValue: false,
    displayOrder: 4,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "cf-cust-005",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "preferred_contact_time",
    displayLabel: "Preferred Contact Time",
    description: "Best time to contact this customer",
    fieldType: "SELECT",
    validation: {},
    options: [
      { id: "opt-1", label: "Morning (9am-12pm)", value: "morning", order: 1 },
      { id: "opt-2", label: "Afternoon (12pm-5pm)", value: "afternoon", order: 2 },
      { id: "opt-3", label: "Evening (5pm-8pm)", value: "evening", order: 3 },
    ],
    displayOrder: 5,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "cf-cust-006",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "interests",
    displayLabel: "Interests",
    description: "Customer's product interests",
    fieldType: "MULTISELECT",
    validation: {},
    options: [
      { id: "opt-1", label: "Product Updates", value: "product_updates", order: 1 },
      { id: "opt-2", label: "Promotions", value: "promotions", order: 2 },
      { id: "opt-3", label: "Events", value: "events", order: 3 },
      { id: "opt-4", label: "Newsletter", value: "newsletter", order: 4 },
    ],
    displayOrder: 6,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-15"),
  },
  {
    id: "cf-cust-007",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "birth_date",
    displayLabel: "Birth Date",
    description: "Customer's date of birth",
    fieldType: "DATE",
    validation: {},
    displayOrder: 7,
    isVisible: true,
    isSearchable: false,
    isFilterable: false,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "cf-cust-008",
    tenantId: mockTenantId,
    entityType: "CUSTOMER",
    fieldKey: "secondary_email",
    displayLabel: "Secondary Email",
    description: "Alternative email address",
    fieldType: "EMAIL",
    validation: {
      required: false,
    },
    displayOrder: 8,
    isVisible: true,
    isSearchable: true,
    isFilterable: false,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
]

export const mockBroadcastFields: CustomFieldDefinition[] = [
  {
    id: "cf-bcast-001",
    tenantId: mockTenantId,
    entityType: "BROADCAST",
    fieldKey: "campaign_id",
    displayLabel: "Campaign ID",
    description: "External campaign identifier for tracking",
    fieldType: "TEXT",
    validation: {
      required: false,
      maxLength: 50,
    },
    displayOrder: 1,
    isVisible: true,
    isSearchable: true,
    isFilterable: false,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "cf-bcast-002",
    tenantId: mockTenantId,
    entityType: "BROADCAST",
    fieldKey: "priority",
    displayLabel: "Priority",
    description: "Broadcast priority level",
    fieldType: "SELECT",
    validation: {},
    options: [
      { id: "opt-1", label: "Low", value: "low", color: "gray", order: 1 },
      { id: "opt-2", label: "Medium", value: "medium", color: "yellow", order: 2 },
      { id: "opt-3", label: "High", value: "high", color: "red", order: 3 },
    ],
    defaultValue: "medium",
    displayOrder: 2,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "cf-bcast-003",
    tenantId: mockTenantId,
    entityType: "BROADCAST",
    fieldKey: "budget",
    displayLabel: "Budget",
    description: "Allocated budget for this broadcast",
    fieldType: "NUMBER",
    validation: {
      min: 0,
      decimal: true,
      precision: 2,
    },
    displayOrder: 3,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-10"),
  },
]

export const mockTemplateFields: CustomFieldDefinition[] = [
  {
    id: "cf-tmpl-001",
    tenantId: mockTenantId,
    entityType: "TEMPLATE",
    fieldKey: "department",
    displayLabel: "Department",
    description: "Department that owns this template",
    fieldType: "SELECT",
    validation: {},
    options: [
      { id: "opt-1", label: "Marketing", value: "marketing", order: 1 },
      { id: "opt-2", label: "Sales", value: "sales", order: 2 },
      { id: "opt-3", label: "Support", value: "support", order: 3 },
      { id: "opt-4", label: "Operations", value: "operations", order: 4 },
    ],
    displayOrder: 1,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-25"),
  },
  {
    id: "cf-tmpl-002",
    tenantId: mockTenantId,
    entityType: "TEMPLATE",
    fieldKey: "approval_required",
    displayLabel: "Approval Required",
    description: "Whether this template requires approval before use",
    fieldType: "BOOLEAN",
    validation: {},
    defaultValue: false,
    displayOrder: 2,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-25"),
  },
]

export const mockConversationFields: CustomFieldDefinition[] = [
  {
    id: "cf-conv-001",
    tenantId: mockTenantId,
    entityType: "CONVERSATION",
    fieldKey: "ticket_id",
    displayLabel: "Ticket ID",
    description: "External ticket system reference",
    fieldType: "TEXT",
    validation: {
      maxLength: 50,
    },
    displayOrder: 1,
    isVisible: true,
    isSearchable: true,
    isFilterable: false,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "cf-conv-002",
    tenantId: mockTenantId,
    entityType: "CONVERSATION",
    fieldKey: "sentiment",
    displayLabel: "Sentiment",
    description: "Customer sentiment analysis",
    fieldType: "SELECT",
    validation: {},
    options: [
      { id: "opt-1", label: "Positive", value: "positive", color: "green", order: 1 },
      { id: "opt-2", label: "Neutral", value: "neutral", color: "gray", order: 2 },
      { id: "opt-3", label: "Negative", value: "negative", color: "red", order: 3 },
    ],
    displayOrder: 2,
    isVisible: true,
    isSearchable: false,
    isFilterable: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "cf-conv-003",
    tenantId: mockTenantId,
    entityType: "CONVERSATION",
    fieldKey: "resolution_notes",
    displayLabel: "Resolution Notes",
    description: "Notes about how the conversation was resolved",
    fieldType: "TEXTAREA",
    validation: {
      maxLength: 500,
    },
    displayOrder: 3,
    isVisible: true,
    isSearchable: true,
    isFilterable: false,
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-15"),
  },
]

// ============================================
// Mock Data Access Functions
// ============================================

const allMockFields: CustomFieldDefinition[] = [
  ...mockCustomerFields,
  ...mockBroadcastFields,
  ...mockTemplateFields,
  ...mockConversationFields,
]

/**
 * Get all custom field definitions for a specific entity type
 */
export function getCustomFieldsForEntity(
  entityType: CustomFieldEntityType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tenantId?: string
): CustomFieldDefinition[] {
  return allMockFields
    .filter((f) => f.entityType === entityType)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Get a single custom field definition by ID
 */
export function getCustomFieldById(
  id: string
): CustomFieldDefinition | undefined {
  return allMockFields.find((f) => f.id === id)
}

/**
 * Get all visible custom fields for an entity type
 */
export function getVisibleCustomFieldsForEntity(
  entityType: CustomFieldEntityType,
  tenantId?: string
): CustomFieldDefinition[] {
  return getCustomFieldsForEntity(entityType, tenantId).filter(
    (f) => f.isVisible
  )
}

/**
 * Get all filterable custom fields for an entity type
 */
export function getFilterableCustomFieldsForEntity(
  entityType: CustomFieldEntityType,
  tenantId?: string
): CustomFieldDefinition[] {
  return getCustomFieldsForEntity(entityType, tenantId).filter(
    (f) => f.isFilterable && f.isVisible
  )
}

/**
 * Get all searchable custom fields for an entity type
 */
export function getSearchableCustomFieldsForEntity(
  entityType: CustomFieldEntityType,
  tenantId?: string
): CustomFieldDefinition[] {
  return getCustomFieldsForEntity(entityType, tenantId).filter(
    (f) => f.isSearchable && f.isVisible
  )
}

// ============================================
// Mock CRUD Operations (simulated async)
// ============================================

let nextId = 100

/**
 * Simulate creating a new custom field definition
 */
export async function createCustomField(
  data: Omit<CustomFieldDefinition, "id" | "createdAt" | "updatedAt">
): Promise<CustomFieldDefinition> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const newField: CustomFieldDefinition = {
    ...data,
    id: `cf-new-${++nextId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  allMockFields.push(newField)
  return newField
}

/**
 * Simulate updating a custom field definition
 */
export async function updateCustomField(
  id: string,
  data: Partial<CustomFieldDefinition>
): Promise<CustomFieldDefinition> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const index = allMockFields.findIndex((f) => f.id === id)
  if (index === -1) {
    throw new Error(`Custom field not found: ${id}`)
  }

  const updated: CustomFieldDefinition = {
    ...allMockFields[index],
    ...data,
    id, // Ensure ID cannot be changed
    updatedAt: new Date(),
  }

  allMockFields[index] = updated
  return updated
}

/**
 * Simulate deleting a custom field definition
 */
export async function deleteCustomField(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const index = allMockFields.findIndex((f) => f.id === id)
  if (index === -1) {
    throw new Error(`Custom field not found: ${id}`)
  }

  allMockFields.splice(index, 1)
}

/**
 * Simulate reordering custom fields
 */
export async function reorderCustomFields(
  entityType: CustomFieldEntityType,
  orderedIds: string[]
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  orderedIds.forEach((id, index) => {
    const field = allMockFields.find((f) => f.id === id)
    if (field && field.entityType === entityType) {
      field.displayOrder = index + 1
      field.updatedAt = new Date()
    }
  })
}
