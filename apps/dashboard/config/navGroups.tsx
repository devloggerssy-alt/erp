import type { NavGroup, NavSubItem } from "@/infrastructure/types/navigation"
import { SETTINGS_NAV_ITEMS } from "@/modules/settings/settings-navigation"
import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  UsersIcon,
  StoreIcon,
  PackageIcon,
  LayersIcon,
  RulerIcon,
  WarehouseIcon,
  BarChart3Icon,
  ArrowLeftRightIcon,
  ClipboardCheckIcon,
  ScaleIcon,
  WalletIcon,
  HandCoinsIcon,
  BookIcon,
  LineChartIcon,
  SettingsIcon,
  HashIcon,
  TagIcon,
  ListTreeIcon,
  AwardIcon,
  CreditCardIcon,
  LandmarkIcon,
} from "lucide-react"

export const navGroups: NavGroup[] = [
  {
    items: [
      {
        titleKey: "business.navigation.items.dashboard",
        permission: "dashboard.view",
        href: "/",
        icon: <LayoutDashboardIcon />,
      },
      {
        titleKey: "business.navigation.items.cashier",
        permission: "pos.checkout",
        href: "/cashier",
        icon: <ReceiptIcon />,
      },
      {
        titleKey: "business.navigation.items.aiAssistant",
        permission: "ai.view",
        href: "/ai",
        icon: <MessageSquareIcon />,
      },
    ],
  },
  {
    labelKey: "business.navigation.groups.commercial",
    items: [
      {
        titleKey: "business.navigation.items.sales",
        permission: "invoices.view",
        href: "/sales/invoices",
        icon: <ReceiptIcon />,
        readinessModule: "sales",
        items: [
          {
            titleKey: "business.navigation.items.salesInvoices",
            permission: "invoices.view",
            href: "/sales/invoices",
            icon: <ReceiptIcon />,
            readinessModule: "sales",
          },
          {
            titleKey: "business.navigation.items.customers",
            permission: "parties.view",
            href: "/parties/customers",
            icon: <UsersIcon />,
            readinessModule: "sales",
          },
        ],
      },
      {
        titleKey: "business.navigation.items.purchases",
        permission: "invoices.view",
        href: "/purchases/invoices",
        icon: <ShoppingCartIcon />,
        readinessModule: "purchasing",
        items: [
          {
            titleKey: "business.navigation.items.purchaseInvoices",
            permission: "invoices.view",
            href: "/purchases/invoices",
            icon: <ShoppingCartIcon />,
            readinessModule: "purchasing",
          },
          {
            titleKey: "business.navigation.items.suppliers",
            permission: "parties.view",
            href: "/parties/suppliers",
            icon: <StoreIcon />,
            readinessModule: "purchasing",
          },
        ],
      },
    ],
  },
  {
    labelKey: "business.navigation.groups.inventory",
    items: [
      {
        titleKey: "business.navigation.items.catalog",
        permission: "items.view",
        href: "/catalog/items",
        icon: <PackageIcon />,
        readinessModule: "inventory",
        items: [
          {
            titleKey: "business.navigation.items.itemsList",
            permission: "items.view",
            href: "/catalog/items",
            icon: <PackageIcon />,
            readinessModule: "inventory",
          },
          {
            titleKey: "business.navigation.items.categories",
            permission: "itemCategories.view",
            href: "/catalog/categories",
            icon: <LayersIcon />,
          },
          {
            titleKey: "business.navigation.items.units",
            permission: "units.view",
            href: "/catalog/units",
            icon: <RulerIcon />,
          },
          {
            titleKey: "business.navigation.items.customFields",
            permission: "customFields.view",
            href: "/catalog/custom-fields",
            icon: <HashIcon />,
          },
          {
            titleKey: "business.navigation.items.tags",
            permission: "tags.view",
            href: "/catalog/tags",
            icon: <TagIcon />,
          },
          {
            titleKey: "business.navigation.items.catalogEntities",
            permission: "catalogEntities.view",
            href: "/catalog/catalog-entities",
            icon: <ListTreeIcon />,
          },
          {
            titleKey: "business.navigation.items.brands",
            permission: "brands.view",
            href: "/catalog/brands",
            icon: <AwardIcon />,
          },
        ],
      },
      {
        titleKey: "business.navigation.items.warehouses",
        permission: "warehouses.view",
        href: "/inventory/warehouses",
        icon: <WarehouseIcon />,
        readinessModule: "inventory",
        items: [
          {
            titleKey: "business.navigation.items.warehouseList",
            permission: "warehouses.view",
            href: "/inventory/warehouses",
            icon: <WarehouseIcon />,
            readinessModule: "inventory",
          },
          {
            titleKey: "business.navigation.items.stockBalances",
            permission: "inventory.view",
            href: "/inventory/stock-balances",
            icon: <BarChart3Icon />,
            readinessModule: "inventory",
          },
          {
            titleKey: "business.navigation.items.stockMovements",
            permission: "stockLedger.view",
            href: "/inventory/stock-movements",
            icon: <ArrowLeftRightIcon />,
            readinessModule: "inventory",
          },
          {
            titleKey: "business.navigation.items.stockCounts",
            permission: "stockCounts.view",
            href: "/inventory/stock-counts",
            icon: <ClipboardCheckIcon />,
            readinessModule: "inventory",
          },
          {
            titleKey: "business.navigation.items.openingBalances",
            permission: "inventory.view",
            href: "/inventory/opening-balances",
            icon: <ScaleIcon />,
            readinessModule: "inventory",
          },
        ],
      },
    ],
  },
  {
    labelKey: "business.navigation.groups.finance",
    items: [
      {
        titleKey: "business.navigation.items.cashboxes",
        permission: "cashboxes.view",
        href: "/finance/cashboxes",
        icon: <WalletIcon />,
        readinessModule: "cashOps",
        items: [
          {
            titleKey: "business.navigation.items.cashboxesList",
            permission: "cashboxes.view",
            href: "/finance/cashboxes",
            icon: <WalletIcon />,
            readinessModule: "cashOps",
          },
          {
            titleKey: "business.navigation.items.bankAccounts",
            permission: "bankAccounts.view",
            href: "/finance/bank-accounts",
            icon: <LandmarkIcon />,
            readinessModule: "bankOps",
          },
          {
            titleKey: "business.navigation.items.expenses",
            permission: "expenses.view",
            href: "/finance/expenses",
            icon: <CreditCardIcon />,
          },
          {
            titleKey: "business.navigation.items.payments",
            permission: "payments.view",
            href: "/finance/payments",
            icon: <HandCoinsIcon />,
            readinessModule: "cashOps",
          },
        ],
      },
      {
        titleKey: "business.navigation.items.accounting",
        permission: "accounts.view",
        href: "/finance/chart-of-accounts",
        icon: <BookIcon />,
        readinessModule: "accounting",
        items: [
          {
            titleKey: "business.navigation.items.chartOfAccounts",
            permission: "accounts.view",
            href: "/finance/chart-of-accounts",
            icon: <BookIcon />,
            readinessModule: "accounting",
          },
          {
            titleKey: "business.navigation.items.openingBalancesGL",
            permission: "openingBalanceSessions.view",
            href: "/finance/opening-balances",
            icon: <ScaleIcon />,
            readinessModule: "accounting",
          },
        ],
      },
    ],
  },
  {
    labelKey: "business.navigation.groups.reports",
    items: [
      {
        titleKey: "business.navigation.items.generalReports",
        permission: "reports.view",
        href: "/reports",
        icon: <LineChartIcon />,
        items: [
          {
            titleKey: "business.navigation.items.stockReports",
            permission: "reports.view",
            href: "/reports/stock",
            icon: <BarChart3Icon />,
          },
          {
            titleKey: "business.navigation.items.salesReports",
            permission: "reports.view",
            href: "/reports/sales",
            icon: <LineChartIcon />,
          },
          {
            titleKey: "business.navigation.items.purchaseReports",
            permission: "reports.view",
            href: "/reports/purchases",
            icon: <LineChartIcon />,
          },
          {
            titleKey: "business.navigation.items.accountStatements",
            permission: "reports.view",
            href: "/reports/customers",
            icon: <UsersIcon />,
          },
        ],
      },
    ],
  },
  {
    labelKey: "business.navigation.groups.settings",
    items: [
      {
        // Single entry point: every settings page lives under /settings and is
        // listed here from SETTINGS_NAV_ITEMS, so the sidebar can never drift
        // out of sync with the in-page settings nav. No permission on the
        // parent — it renders when any sub-item is granted (see filterNavGroups).
        titleKey: "business.navigation.groups.settings",
        href: "/settings",
        icon: <SettingsIcon />,
        items: settingsSubItems(),
      },
    ],
  },
]

function settingsSubItems(): NavSubItem[] {
  return SETTINGS_NAV_ITEMS.map((item) => {
    const Icon = item.icon
    return {
      titleKey: `business.settings.${item.labelKey}`,
      href: item.href,
      permission: item.permission,
      icon: <Icon />,
    }
  })
}
