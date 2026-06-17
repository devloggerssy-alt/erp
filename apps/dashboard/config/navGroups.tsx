import type { NavGroup } from "@/infrastructure/types/navigation"
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
  Building2Icon,
  UserCogIcon,
  ShieldCheckIcon,
  CoinsIcon,
  CalendarIcon,
  HashIcon,
  TagIcon,
  ListTreeIcon,
  AwardIcon,
  CreditCardIcon,
} from "lucide-react"

export const navGroups: NavGroup[] = [
  {
    items: [
      {
        titleKey: "business.navigation.items.dashboard",
        href: "/",
        icon: <LayoutDashboardIcon />,
      },
      {
        titleKey: "business.navigation.items.cashier",
        href: "/cashier",
        icon: <ReceiptIcon />,
      },
      {
        titleKey: "business.navigation.items.aiAssistant",
        href: "/ai/chat",
        icon: <MessageSquareIcon />,
      },
    ],
  },
  {
    labelKey: "business.navigation.groups.commercial",
    items: [
      {
        titleKey: "business.navigation.items.sales",
        href: "/sales/invoices",
        icon: <ReceiptIcon />,
        items: [
          {
            titleKey: "business.navigation.items.salesInvoices",
            href: "/sales/invoices",
            icon: <ReceiptIcon />,
          },
          {
            titleKey: "business.navigation.items.customers",
            href: "/parties/customers",
            icon: <UsersIcon />,
          },
        ],
      },
      {
        titleKey: "business.navigation.items.purchases",
        href: "/purchases/invoices",
        icon: <ShoppingCartIcon />,
        items: [
          {
            titleKey: "business.navigation.items.purchaseInvoices",
            href: "/purchases/invoices",
            icon: <ShoppingCartIcon />,
          },
          {
            titleKey: "business.navigation.items.suppliers",
            href: "/parties/suppliers",
            icon: <StoreIcon />,
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
        href: "/catalog/items",
        icon: <PackageIcon />,
        items: [
          {
            titleKey: "business.navigation.items.itemsList",
            href: "/catalog/items",
            icon: <PackageIcon />,
          },
          {
            titleKey: "business.navigation.items.categories",
            href: "/catalog/categories",
            icon: <LayersIcon />,
          },
          {
            titleKey: "business.navigation.items.units",
            href: "/catalog/units",
            icon: <RulerIcon />,
          },
          {
            titleKey: "business.navigation.items.customFields",
            href: "/catalog/custom-fields",
            icon: <HashIcon />,
          },
          {
            titleKey: "business.navigation.items.tags",
            href: "/catalog/tags",
            icon: <TagIcon />,
          },
          {
            titleKey: "business.navigation.items.catalogEntities",
            href: "/catalog/catalog-entities",
            icon: <ListTreeIcon />,
          },
          {
            titleKey: "business.navigation.items.brands",
            href: "/catalog/brands",
            icon: <AwardIcon />,
          },
        ],
      },
      {
        titleKey: "business.navigation.items.warehouses",
        href: "/inventory/warehouses",
        icon: <WarehouseIcon />,
        items: [
          {
            titleKey: "business.navigation.items.warehouseList",
            href: "/inventory/warehouses",
            icon: <WarehouseIcon />,
          },
          {
            titleKey: "business.navigation.items.stockBalances",
            href: "/inventory/stock-balances",
            icon: <BarChart3Icon />,
          },
          {
            titleKey: "business.navigation.items.stockMovements",
            href: "/inventory/stock-movements",
            icon: <ArrowLeftRightIcon />,
          },
          {
            titleKey: "business.navigation.items.stockCounts",
            href: "/inventory/stock-counts",
            icon: <ClipboardCheckIcon />,
          },
          {
            titleKey: "business.navigation.items.openingBalances",
            href: "/inventory/opening-balances",
            icon: <ScaleIcon />,
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
        href: "/finance/cashboxes",
        icon: <WalletIcon />,
        items: [
          {
            titleKey: "business.navigation.items.cashboxesList",
            href: "/finance/cashboxes",
            icon: <WalletIcon />,
          },
          {
            titleKey: "business.navigation.items.expenses",
            href: "/finance/expenses",
            icon: <CreditCardIcon />,
          },
          {
            titleKey: "business.navigation.items.payments",
            href: "/finance/payments",
            icon: <HandCoinsIcon />,
          },
        ],
      },
      {
        titleKey: "business.navigation.items.accounting",
        href: "/finance/chart-of-accounts",
        icon: <BookIcon />,
        items: [
          {
            titleKey: "business.navigation.items.chartOfAccounts",
            href: "/finance/chart-of-accounts",
            icon: <BookIcon />,
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
        href: "/reports",
        icon: <LineChartIcon />,
        items: [
          {
            titleKey: "business.navigation.items.stockReports",
            href: "/reports/stock",
            icon: <BarChart3Icon />,
          },
          {
            titleKey: "business.navigation.items.salesReports",
            href: "/reports/sales",
            icon: <LineChartIcon />,
          },
          {
            titleKey: "business.navigation.items.purchaseReports",
            href: "/reports/purchases",
            icon: <LineChartIcon />,
          },
          {
            titleKey: "business.navigation.items.accountStatements",
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
        titleKey: "business.navigation.items.companySettings",
        href: "/settings/company",
        icon: <Building2Icon />,
        items: [
          {
            titleKey: "business.navigation.items.companySettings",
            href: "/settings/company",
            icon: <Building2Icon />,
          },
          {
            titleKey: "business.settings.localization.navLabel",
            href: "/settings/localization",
            icon: <SettingsIcon />,
          },
          {
            titleKey: "business.settings.financial.navLabel",
            href: "/settings/financial",
            icon: <ScaleIcon />,
          },
          {
            titleKey: "business.settings.documents.navLabel",
            href: "/settings/documents",
            icon: <ReceiptIcon />,
          },
        ],
      },
      {
        titleKey: "business.navigation.items.usersAndPermissions",
        href: "/settings/users",
        icon: <UserCogIcon />,
        items: [
          {
            titleKey: "business.navigation.items.users",
            href: "/settings/users",
            icon: <UserCogIcon />,
          },
          {
            titleKey: "business.navigation.items.roles",
            href: "/settings/roles",
            icon: <ShieldCheckIcon />,
          },
        ],
      },
      {
        titleKey: "business.navigation.items.systemSettings",
        href: "/settings/currencies",
        icon: <SettingsIcon />,
        items: [
          {
            titleKey: "business.navigation.items.currencies",
            href: "/settings/currencies",
            icon: <CoinsIcon />,
          },
          {
            titleKey: "business.navigation.items.fiscalPeriods",
            href: "/settings/fiscal-periods",
            icon: <CalendarIcon />,
          },
          {
            titleKey: "business.navigation.items.documentSequences",
            href: "/settings/document-sequences",
            icon: <HashIcon />,
          },
        ],
      },
    ],
  },
]
