"use client"
import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, Tag, Receipt } from 'lucide-react';
import DashboardPage from '@/base/components/layout/dashboard/dashboard-page';

// تعريف أنواع البيانات
interface Product {
    id: number;
    name: string;
    oem: string;
    compatibility: string;
    price: number;
    stock: number;
    category: string;
}

interface CartItem extends Product {
    quantity: number;
    discount: number; // خصم على مستوى القطعة
}

const CATEGORIES = ['الكل', 'كهرباء', 'صيانة دورية', 'فرامل', 'ميكانيك'];
const TAX_RATE = 0; // ضريبة 5%

const initialProducts: Product[] = [
    { id: 1, name: 'بواجي ليزر NGK', oem: '90919-01191', compatibility: 'تويوتا كامري 15-20', price: 150000, stock: 40, category: 'كهرباء' },
    { id: 2, name: 'فلتر زيت بوش', oem: '0986AF1163', compatibility: 'هيونداي إلنترا', price: 45000, stock: 15, category: 'صيانة دورية' },
    { id: 3, name: 'فحمات فرامل أمامية', oem: '04465-33471', compatibility: 'لكزس ES', price: 250000, stock: 8, category: 'فرامل' },
    { id: 4, name: 'فلتر هواء اصلي', oem: '28113-L1000', compatibility: 'كيا K5', price: 60000, stock: 22, category: 'صيانة دورية' },
    { id: 5, name: 'زيت محرك كاسترول 5W30', oem: 'CAS-5W30', compatibility: 'شامل', price: 300000, stock: 50, category: 'صيانة دورية' },
    { id: 6, name: 'مساعدات خلفية يمين', oem: '55311-2S000', compatibility: 'هيونداي توسان', price: 450000, stock: 4, category: 'ميكانيك' }
];

export default function PosInterface() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('الكل');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);
    const [isSuccess, setIsSuccess] = useState(false);

    // فلترة المنتجات (بحث + تصنيف)
    const filteredProducts = useMemo(() => {
        return initialProducts.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.oem.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
            return matchSearch && matchCategory;
        });
    }, [searchQuery, selectedCategory]);

    // إدارة السلة
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1, discount: 0 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const newQuantity = Math.max(0, item.quantity + delta);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter((item) => item.quantity > 0)
        );
    };

    const updateItemDiscount = (id: number, discountAmount: number) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    // منع الخصم من تجاوز سعر القطعة الإجمالي
                    const maxDiscount = item.price * item.quantity;
                    const safeDiscount = Math.min(Math.max(0, discountAmount), maxDiscount);
                    return { ...item, discount: safeDiscount };
                }
                return item;
            })
        );
    };

    const removeFromCart = (id: number) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    // الحسابات المالية (المنطق المحاسبي)
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
    const netAfterItemDiscounts = Math.max(0, subtotal - totalItemDiscounts);
    const safeInvoiceDiscount = Math.min(Math.max(0, invoiceDiscount || 0), netAfterItemDiscounts);
    const taxableAmount = netAfterItemDiscounts - safeInvoiceDiscount;
    const taxAmount = taxableAmount * TAX_RATE;
    const finalTotal = taxableAmount + taxAmount;

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setIsSuccess(true);
        setCart([]);
        setInvoiceDiscount(0);
        setTimeout(() => setIsSuccess(false), 3000);
    };

    return (
        <DashboardPage>

            <div className=" bg-background text-foreground">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* قسم الكتالوج */}
                    <div className="lg:col-span-2 flex flex-col gap-4">

                        {/* البحث والتصنيفات */}
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                                    <Search className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 ps-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                                    placeholder="ابحث باسم القطعة أو رقم OEM..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {CATEGORIES.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${selectedCategory === category
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* شبكة المنتجات */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-12rem)] pb-4">
                            {filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                                >
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors mb-2">
                                            {product.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                                                {product.oem}
                                            </span>
                                            <span className="inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                                                {product.compatibility}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-auto">
                                        <span className="text-xl font-black text-primary">
                                            {product.price.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                                            الستوك: {product.stock}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* قسم الفاتورة */}
                    <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm flex flex-col h-[calc(100vh-6rem)] sticky top-6">
                        <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/20">
                            <Receipt className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold">تفاصيل الفاتورة</h2>
                        </div>

                        {/* عناصر الفاتورة */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                            {cart.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl border-border">
                                    الفاتورة فارغة، اضغط على القطع لإضافتها
                                </div>
                            ) : (
                                cart.map((item) => {
                                    const itemTotal = (item.price * item.quantity) - item.discount;
                                    return (
                                        <div key={item.id} className="flex flex-col gap-3 p-3 bg-background border border-border rounded-lg shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-sm">{item.name}</h4>
                                                    <p className="text-xs text-muted-foreground">{item.price.toLocaleString()} × {item.quantity}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex justify-between items-center gap-4">
                                                {/* التحكم بالكمية */}
                                                <div className="flex items-center gap-3 bg-muted rounded-md p-1 border">
                                                    <button onClick={() => updateQuantity(item.id, 1)} className="bg-background hover:bg-card text-foreground rounded p-1 shadow-sm"><Plus className="w-3 h-3" /></button>
                                                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, -1)} className="bg-background hover:bg-card text-foreground rounded p-1 shadow-sm"><Minus className="w-3 h-3" /></button>
                                                </div>

                                                {/* إدخال خصم القطعة */}
                                                <div className="flex items-center relative w-24">
                                                    <Tag className="w-3 h-3 text-muted-foreground absolute start-2" />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.discount || ''}
                                                        onChange={(e) => updateItemDiscount(item.id, Number(e.target.value))}
                                                        placeholder="خصم..."
                                                        className="w-full text-xs h-8 ps-6 pe-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="text-end font-bold text-sm text-primary border-t pt-2 mt-1">
                                                {itemTotal.toLocaleString()} ل.س
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* ملخص الفاتورة */}
                        <div className="p-4 bg-muted/40 border-t border-border rounded-b-xl flex flex-col gap-2 text-sm">

                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>المجموع الفرعي:</span>
                                <span>{subtotal.toLocaleString()}</span>
                            </div>

                            {totalItemDiscounts > 0 && (
                                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                    <span>مجموع خصومات القطع:</span>
                                    <span>- {totalItemDiscounts.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-2 border-y border-border/50 my-1">
                                <label htmlFor="invoice-discount" className="font-medium flex items-center gap-1">
                                    <Tag className="w-4 h-4 text-muted-foreground" /> خصم الفاتورة:
                                </label>
                                <input
                                    id="invoice-discount"
                                    type="number"
                                    min="0"
                                    value={invoiceDiscount || ''}
                                    onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                                    className="w-28 text-sm h-8 px-2 rounded-md border border-input bg-background text-end focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="0 ل.س"
                                />
                            </div>

                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>الضريبة ({TAX_RATE * 100}%):</span>
                                <span>+ {taxAmount.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center mt-2 mb-4">
                                <span className="text-foreground font-bold text-lg">الصافي للدفع:</span>
                                <span className="text-3xl font-black text-primary">
                                    {finalTotal.toLocaleString()} <span className="text-sm font-normal text-foreground">ل.س</span>
                                </span>
                            </div>

                            {isSuccess ? (
                                <div className="flex items-center justify-center gap-2 w-full bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg font-bold border border-green-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                    تم قبض الفاتورة بنجاح!
                                </div>
                            ) : (
                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0}
                                    className="w-full inline-flex items-center justify-center rounded-lg text-lg font-bold transition-colors focus-visible:outline-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-14 shadow-glow"
                                >
                                    دفع {finalTotal.toLocaleString()} ل.س
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </DashboardPage>
    );
}