import { z } from 'zod';

export const invoiceItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'), // Will translate later or pass error map
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    rate: z.number().min(0, 'Rate must be non-negative'),
    amount: z.number(),
});

export const invoiceSchema = z.object({
    clientId: z.string().min(1, 'Client is required'),
    companyProfileId: z.string().optional(), // Can be empty if only one profile or default
    invoiceNumber: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    issueDate: z.date(),
    dueDate: z.date(),
    fulfillmentDate: z.date(),
    paymentMethod: z.enum(['transfer', 'card', 'cash']),
    currency: z.string().default('USD'),
    taxRate: z.number().min(0).default(0),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    notes: z.string().optional(),
});

export const clientSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    company: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
});

export const companyProfileSchema = z.object({
    name: z.string().min(1, 'Company Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    address: z.string().optional(),
    phone: z.string().optional(),
    taxNumber: z.string().optional(),
    bankAccount: z.string().optional(),
    logo: z.string().optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
