# Database Schema Reference

This document provides a comprehensive reference for the ERP system's database schema, implemented using Prisma and PostgreSQL.

## Overview
The schema is designed for a multi-tenant ERP system where all business data is scoped by `tenantId`.

---

## 1. Core Module
Handles multi-tenancy and authentication.

### Tenants
| Model | Table | Description |
| :--- | :--- | :--- |
| `Tenant` | `tenants` | The root entity for all data partitioning. |

**Fields:**
- `id`: UUID (Primary Key)
- `name`: String
- `slug`: String (Unique)
- `isActive`: Boolean (Default: true)
- ... (contact info, timestamps)

### Identity & Access Management
| Model | Table | Description |
| :--- | :--- | :--- |
| `AppUser` | `app_users` | System users scoped by tenant. |
| `Role` | `roles` | Permission roles within a tenant. |
| `UserRole` | `user_roles` | Join table for many-to-many user-role assignment. |

---

## 2. Catalog Module
Handles product data and classification.

### Items & Categories
| Model | Table | Description |
| :--- | :--- | :--- |
| `Item` | `items` | Products or services managed in the system. |
| `ItemCategory` | `item_categories` | Hierarchical classification for items. |
| `Unit` | `units` | Units of measure (e.g., Kg, Piece, Box). |

---

## 3. Inventory Module
Manages physical locations and stock levels.

### Warehousing
| Model | Table | Description |
| :--- | :--- | :--- |
| `Warehouse` | `warehouses` | Physical storage locations. |
| `WarehouseItem` | `warehouse_items` | Tenant/Warehouse settings for items (Min/Max quantity). |

### Stock Tracking
| Model | Table | Description |
| :--- | :--- | :--- |
| `StockBalance` | `stock_balances` | Snapshot of current stock levels (Projection table). |
| `StockMovement` | `stock_movements` | Ledger of all quantity changes (Source of truth). |

### Stock Counts
| Model | Table | Description |
| :--- | :--- | :--- |
| `StockCount` | `stock_counts` | Physical inventory count sessions. |
| `StockCountLine` | `stock_count_lines` | Detailed count records per item. |

---

## 4. Sales & Purchases Module
Handles trade documents and business partners.

### Invoicing
| Model | Table | Description |
| :--- | :--- | :--- |
| `Invoice` | `invoices` | Sales and purchase transaction headers. |
| `InvoiceLine` | `invoice_lines` | Individual items/services in an invoice. |
| `InvoiceType` | `invoice_types` | Definitions for different invoice behaviors (Sale/Purchase). |

### Parties & Currencies
| Model | Table | Description |
| :--- | :--- | :--- |
| `Party` | `parties` | Customers and Suppliers. |
| `Currency` | `currencies` | Supported currencies and exchange info. |

---

## 5. Finance & Accounting Module
Manages cash flow and financial records.

### Cash & Payments
| Model | Table | Description |
| :--- | :--- | :--- |
| `Cashbox` | `cashboxes` | Physical or virtual cash accounts. |
| `Payment` | `payments` | Monetary transactions (Receipts/Payments). |
| `PaymentAllocation` | `payment_allocations` | Mapping payments to specific invoices. |

### General Ledger
| Model | Table | Description |
| :--- | :--- | :--- |
| `ChartOfAccount` | `chart_of_accounts` | Hierarchical tree of financial accounts. |
| `JournalEntry` | `journal_entries` | Accounting double-entry document. |
| `JournalLine` | `journal_lines` | Individual debit/credit lines in a journal entry. |

---

## 6. System Module
Infrastructure and support features.

### Audit & Logs
| Model | Table | Description |
| :--- | :--- | :--- |
| `AuditLog` | `audit_logs` | Record of all data mutations and system actions. |

### AI Assistance
| Model | Table | Description |
| :--- | :--- | :--- |
| `AiChatSession` | `ai_chat_sessions` | Context sessions for the AI assistant. |
| `AiChatMessage` | `ai_chat_messages` | Individual messages within a session. |

### Configuration
| Model | Table | Description |
| :--- | :--- | :--- |
| `DocumentSequence` | `document_sequences` | Auto-numbering settings for invoices/payments. |
| `FiscalPeriod` | `fiscal_periods` | Defined accounting periods (Months/Years). |

---

## Enums Reference

| Enum | Values |
| :--- | :--- |
| `AccountType` | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| `JournalEntryStatus`| DRAFT, POSTED |
| `MessageRole` | USER, ASSISTANT |
| `PaymentType` | RECEIPT, PAYMENT, EXPENSE, ADJUSTMENT |
| `PaymentStatus` | DRAFT, POSTED, CANCELLED |
| `InvoiceDirection` | PURCHASE, SALE |
| `InvoiceStatus` | DRAFT, POSTED, CANCELLED |
| `PartyType` | CUSTOMER, SUPPLIER, CUSTOMER_SUPPLIER |
| `StockCountStatus` | DRAFT, POSTED, CANCELLED |
| `StockMovementType` | OPENING, PURCHASE, SALE, ADJUSTMENT, STOCK_COUNT, TRANSFER_IN, TRANSFER_OUT |
| `FiscalPeriodStatus`| OPEN, CLOSED, LOCKED |
