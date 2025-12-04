import type { Customer, Tag } from "../types"

// Predefined tags that users can select from
export const availableTags: Tag[] = [
  { id: "tag-1", name: "VIP", color: "purple" },
  { id: "tag-2", name: "Lead", color: "blue" },
  { id: "tag-3", name: "Active", color: "green" },
  { id: "tag-4", name: "Inactive", color: "gray" },
  { id: "tag-5", name: "New", color: "yellow" },
  { id: "tag-6", name: "Premium", color: "orange" },
  { id: "tag-7", name: "At Risk", color: "red" },
  { id: "tag-8", name: "Engaged", color: "pink" },
]

// Mock customer data
export const mockCustomers: Customer[] = [
  {
    id: "cust-1",
    name: "John Smith",
    whatsappNumber: "+1 555-123-4567",
    tags: [availableTags[0], availableTags[2]], // VIP, Active
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-11-20"),
  },
  {
    id: "cust-2",
    name: "Sarah Johnson",
    whatsappNumber: "+1 555-234-5678",
    tags: [availableTags[1], availableTags[4]], // Lead, New
    createdAt: new Date("2024-11-01"),
    updatedAt: new Date("2024-11-28"),
  },
  {
    id: "cust-3",
    name: "Michael Chen",
    whatsappNumber: "+1 555-345-6789",
    tags: [availableTags[2], availableTags[5]], // Active, Premium
    createdAt: new Date("2023-08-22"),
    updatedAt: new Date("2024-11-15"),
  },
  {
    id: "cust-4",
    name: "Emily Davis",
    whatsappNumber: "+1 555-456-7890",
    tags: [availableTags[3]], // Inactive
    createdAt: new Date("2023-05-10"),
    updatedAt: new Date("2024-06-01"),
  },
  {
    id: "cust-5",
    name: "Robert Wilson",
    whatsappNumber: "+1 555-567-8901",
    tags: [availableTags[0], availableTags[5]], // VIP, Premium
    createdAt: new Date("2022-12-03"),
    updatedAt: new Date("2024-11-25"),
  },
  {
    id: "cust-6",
    name: "Lisa Anderson",
    whatsappNumber: "+1 555-678-9012",
    tags: [availableTags[6]], // At Risk
    createdAt: new Date("2024-02-28"),
    updatedAt: new Date("2024-10-15"),
  },
  {
    id: "cust-7",
    name: "David Martinez",
    whatsappNumber: "+1 555-789-0123",
    tags: [availableTags[1], availableTags[7]], // Lead, Engaged
    createdAt: new Date("2024-09-12"),
    updatedAt: new Date("2024-11-30"),
  },
  {
    id: "cust-8",
    name: "Jennifer Taylor",
    whatsappNumber: "+1 555-890-1234",
    tags: [availableTags[2]], // Active
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-11-22"),
  },
  {
    id: "cust-9",
    name: "Christopher Brown",
    whatsappNumber: "+1 555-901-2345",
    tags: [availableTags[4], availableTags[1]], // New, Lead
    createdAt: new Date("2024-11-15"),
    updatedAt: new Date("2024-11-29"),
  },
  {
    id: "cust-10",
    name: "Amanda Garcia",
    whatsappNumber: "+1 555-012-3456",
    tags: [availableTags[0], availableTags[2], availableTags[5]], // VIP, Active, Premium
    createdAt: new Date("2023-01-20"),
    updatedAt: new Date("2024-11-27"),
  },
  {
    id: "cust-11",
    name: "James Lee",
    whatsappNumber: "+1 555-111-2222",
    tags: [availableTags[3], availableTags[6]], // Inactive, At Risk
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2024-08-10"),
  },
  {
    id: "cust-12",
    name: "Michelle Thompson",
    whatsappNumber: "+1 555-222-3333",
    tags: [availableTags[7]], // Engaged
    createdAt: new Date("2024-07-08"),
    updatedAt: new Date("2024-11-18"),
  },
  {
    id: "cust-13",
    name: "Daniel White",
    whatsappNumber: "+1 555-333-4444",
    tags: [availableTags[2], availableTags[7]], // Active, Engaged
    createdAt: new Date("2024-04-22"),
    updatedAt: new Date("2024-11-24"),
  },
  {
    id: "cust-14",
    name: "Jessica Harris",
    whatsappNumber: "+1 555-444-5555",
    tags: [availableTags[1]], // Lead
    createdAt: new Date("2024-10-30"),
    updatedAt: new Date("2024-11-26"),
  },
  {
    id: "cust-15",
    name: "Andrew Clark",
    whatsappNumber: "+1 555-555-6666",
    tags: [availableTags[0], availableTags[2]], // VIP, Active
    createdAt: new Date("2023-11-11"),
    updatedAt: new Date("2024-11-21"),
  },
]
