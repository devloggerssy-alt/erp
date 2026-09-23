import {
  ArrowLeftRight,
  Banknote,
  BookOpenCheck,
  Boxes,
  Building2,
  CalendarRange,
  Coins,
  Hash,
  Landmark,
  ListTree,
  Package,
  PackageOpen,
  Scale,
  Truck,
  Users,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { SetupTaskType } from "../hooks/use-business-setup"
import type { SetupGroupKey } from "../setup.config"

export const SETUP_TASK_ICONS: Record<SetupTaskType, LucideIcon> = {
  CURRENCIES: Coins,
  FISCAL_PERIOD: CalendarRange,
  CHART_OF_ACCOUNTS: ListTree,
  FINANCIAL_MAPPINGS: ArrowLeftRight,
  DOCUMENT_SEQUENCES: Hash,
  CASHBOXES: Vault,
  BANK_ACCOUNTS: Landmark,
  OPENING_CASH_BALANCES: Banknote,
  OPENING_BANK_BALANCES: Building2,
  WAREHOUSES: Boxes,
  PRODUCTS: Package,
  OPENING_INVENTORY: PackageOpen,
  CUSTOMERS: Users,
  SUPPLIERS: Truck,
  OPENING_RECEIVABLES: Wallet,
  OPENING_PAYABLES: Scale,
  RECONCILIATION: BookOpenCheck,
}

export const SETUP_GROUP_ICONS: Record<SetupGroupKey, LucideIcon> = {
  accounting: ListTree,
  money: Wallet,
  inventory: Boxes,
  parties: Users,
}
