"use client"

import React from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts"
import { 
  TrendingUp, 
  ShoppingCart, 
  Wallet, 
  Package, 
  PlusCircle, 
  FileText, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from "lucide-react"

// Mock Data
const chartData = [
  { name: "السبت", sales: 4000, purchases: 2400 },
  { name: "الأحد", sales: 3000, purchases: 1398 },
  { name: "الإثنين", sales: 2000, purchases: 9800 },
  { name: "الثلاثاء", sales: 2780, purchases: 3908 },
  { name: "الأربعاء", sales: 1890, purchases: 4800 },
  { name: "الخميس", sales: 2390, purchases: 3800 },
  { name: "الجمعة", sales: 3490, purchases: 4300 },
]

const recentInvoices = [
  { id: "INV-2024-001", customer: "شركة الأفق للتجارة", amount: "5,400 ر.س", status: "مرحلة", date: "2024-04-26" },
  { id: "INV-2024-002", customer: "مؤسسة الرواد", amount: "1,250 ر.س", status: "مسودة", date: "2024-04-25" },
  { id: "INV-2024-003", customer: "عبدالله محمد", amount: "800 ر.س", status: "مرحلة", date: "2024-04-24" },
  { id: "INV-2024-004", customer: "شركة التقنية الحديثة", amount: "12,000 ر.س", status: "ملغاة", date: "2024-04-23" },
]

const lowStockItems = [
  { name: "شاشة سامسونج 24 بوصة", stock: 3, min: 10 },
  { name: "لوحة مفاتيح ميكانيكية", stock: 1, min: 5 },
  { name: "كابل HDMI 2M", stock: 0, min: 20 },
  { name: "طابعة ليزر HP", stock: 2, min: 4 },
]

export function DashboardContent() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">نظرة عامة</h1>
          <p className="text-muted-foreground mt-1">
            مرحباً بك في لوحة تحكم النظام. إليك ملخص لأهم مؤشرات الأداء.
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <PlusCircle className="ml-2 h-4 w-4" />
            إنشاء مستند
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231 ر.س</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+20.1%</span> من الشهر الماضي
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450 ر.س</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500 font-medium">-4.5%</span> من الشهر الماضي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رصيد الخزينة</CardTitle>
            <Wallet className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128,500 ر.س</div>
            <p className="text-xs text-muted-foreground mt-1">
              الرصيد المتاح حالياً
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,429</div>
            <p className="text-xs text-muted-foreground mt-1">
              24 صنف مضاف حديثاً
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">الإجراءات السريعة</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
            <FileText className="h-6 w-6" />
            <span>فاتورة مبيعات</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-primary hover:text-primary transition-colors">
            <ShoppingCart className="h-6 w-6" />
            <span>فاتورة مشتريات</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-colors">
            <Wallet className="h-6 w-6" />
            <span>سند قبض</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2 hover:border-red-500 hover:text-red-500 transition-colors">
            <Wallet className="h-6 w-6" />
            <span>سند صرف</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
        
        {/* Chart */}
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>حركة المبيعات والمشتريات</CardTitle>
            <CardDescription>
              مقارنة بين المبيعات والمشتريات خلال الأيام السبعة الماضية
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full mt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888833" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value} ر.س`} 
                    width={80}
                  />
                  <Tooltip 
                    cursor={{fill: '#88888811'}}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #88888833' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="sales" name="المبيعات" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="purchases" name="المشتريات" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="md:col-span-3 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-red-500">
              <AlertTriangle className="w-5 h-5 ml-2" />
              تنبيهات المخزون
            </CardTitle>
            <CardDescription>
              أصناف تجاوزت الحد الأدنى للمخزون
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      الحد الأدنى: {item.min}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                    {item.stock}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6">
              عرض كل النواقص
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>أحدث الفواتير</CardTitle>
          <CardDescription>آخر عمليات المبيعات المسجلة في النظام.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "مرحلة" ? "default" : invoice.status === "مسودة" ? "secondary" : "destructive"}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">{invoice.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}
