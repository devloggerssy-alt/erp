import type { NavGroup } from "@/base/types/navigation"
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
} from "lucide-react"

export const navGroups: NavGroup[] = [
  {
    items: [
      {
        title: "لوحة التحكم",
        href: "/",
        icon: <LayoutDashboardIcon />,
      },
      {
        title: "المساعد الذكي",
        href: "/ai/chat",
        icon: <MessageSquareIcon />,
      },
    ],
  },
  {
    label: "العمليات التجارية",
    items: [
      {
        title: "المبيعات",
        href: "/invoices/sales",
        icon: <ReceiptIcon />,
        items: [
          { title: "فواتير المبيعات", href: "/invoices/sales", icon: <ReceiptIcon /> },
          { title: "العملاء", href: "/parties/customers", icon: <UsersIcon /> },
        ],
      },
      {
        title: "المشتريات",
        href: "/invoices/purchases",
        icon: <ShoppingCartIcon />,
        items: [
          { title: "فواتير المشتريات", href: "/invoices/purchases", icon: <ShoppingCartIcon /> },
          { title: "الموردون", href: "/parties/suppliers", icon: <StoreIcon /> },
        ],
      },
    ],
  },
  {
    label: "المخزون والدليل",
    items: [
      {
        title: "الأصناف",
        href: "/catalog/items",
        icon: <PackageIcon />,
        items: [
          { title: "قائمة الأصناف", href: "/catalog/items", icon: <PackageIcon /> },
          { title: "الفئات", href: "/catalog/categories", icon: <LayersIcon /> },
          { title: "الوحدات", href: "/catalog/units", icon: <RulerIcon /> },
        ],
      },
      {
        title: "المستودعات",
        href: "/inventory/warehouses",
        icon: <WarehouseIcon />,
        items: [
          { title: "قائمة المستودعات", href: "/inventory/warehouses", icon: <WarehouseIcon /> },
          { title: "أرصدة المخزون", href: "/inventory/stock-balances", icon: <BarChart3Icon /> },
          { title: "حركات المخزون", href: "/inventory/stock-movements", icon: <ArrowLeftRightIcon /> },
          { title: "جرد المخزون", href: "/inventory/stock-counts", icon: <ClipboardCheckIcon /> },
          { title: "أرصدة أول المدة", href: "/inventory/opening-balances", icon: <ScaleIcon /> },
        ],
      },
    ],
  },
  {
    label: "المالية",
    items: [
      {
        title: "الخزينة",
        href: "/finance/cashboxes",
        icon: <WalletIcon />,
        items: [
          { title: "صناديق النقد", href: "/finance/cashboxes", icon: <WalletIcon /> },
          { title: "المدفوعات", href: "/finance/payments", icon: <HandCoinsIcon /> },
        ],
      },
      {
        title: "المحاسبة",
        href: "/finance/chart-of-accounts",
        icon: <BookIcon />,
        items: [
          { title: "شجرة الحسابات", href: "/finance/chart-of-accounts", icon: <BookIcon /> },
        ],
      },
    ],
  },
  {
    label: "التقارير",
    items: [
      {
        title: "التقارير العامة",
        href: "/reports",
        icon: <LineChartIcon />,
        items: [
          { title: "تقارير المخزون", href: "/reports/stock", icon: <BarChart3Icon /> },
          { title: "تقارير المبيعات", href: "/reports/sales", icon: <LineChartIcon /> },
          { title: "تقارير المشتريات", href: "/reports/purchases", icon: <LineChartIcon /> },
          { title: "كشوف الحسابات", href: "/reports/customers", icon: <UsersIcon /> },
        ],
      },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      {
        title: "إعدادات الشركة",
        href: "/settings/company",
        icon: <Building2Icon />,
      },
      {
        title: "المستخدمين والصلاحيات",
        href: "/settings/users",
        icon: <UserCogIcon />,
        items: [
          { title: "المستخدمين", href: "/settings/users", icon: <UserCogIcon /> },
          { title: "الأدوار", href: "/settings/roles", icon: <ShieldCheckIcon /> },
        ],
      },
      {
        title: "إعدادات النظام",
        href: "/settings/currencies",
        icon: <SettingsIcon />,
        items: [
          { title: "العملات", href: "/settings/currencies", icon: <CoinsIcon /> },
          { title: "الفترات المالية", href: "/settings/fiscal-periods", icon: <CalendarIcon /> },
          { title: "تسلسل المستندات", href: "/settings/document-sequences", icon: <HashIcon /> },
        ],
      },
    ],
  },
]
