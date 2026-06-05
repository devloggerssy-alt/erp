import arGlobal from "./ar-SY/global.json" with { type: "json" };
import arProducts from "./ar-SY/products.json" with { type: "json" };
import arCategories from "./ar-SY/categories.json" with { type: "json" };
import arStore from "./ar-SY/store.json" with { type: "json" };
import arBanners from "./ar-SY/banners.json" with { type: "json" };
import arCollections from "./ar-SY/collections.json" with { type: "json" };
import arBannerSliders from "./ar-SY/bannerSliders.json" with { type: "json" };
import arPaymentMethods from "./ar-SY/paymentMethods.json" with { type: "json" };
import arOrders from "./ar-SY/orders.json" with { type: "json" };
import arStoreAddresses from "./ar-SY/storeAddresses.json" with { type: "json" };
import arProfile from "./ar-SY/profile.json" with { type: "json" };
import arAuth from "./ar-SY/auth.json" with { type: "json" };

import enGlobal from "./en/global.json" with { type: "json" };
import enProducts from "./en/products.json" with { type: "json" };
import enCategories from "./en/categories.json" with { type: "json" };
import enStore from "./en/store.json" with { type: "json" };
import enBanners from "./en/banners.json" with { type: "json" };
import enCollections from "./en/collections.json" with { type: "json" };
import enBannerSliders from "./en/bannerSliders.json" with { type: "json" };
import enPaymentMethods from "./en/paymentMethods.json" with { type: "json" };
import enOrders from "./en/orders.json" with { type: "json" };
import enStoreAddresses from "./en/storeAddresses.json" with { type: "json" };
import enProfile from "./en/profile.json" with { type: "json" };
import enAuth from "./en/auth.json" with { type: "json" };
export const ar = {
  global: arGlobal,
  products: arProducts,
  categories: arCategories,
  store: arStore,
  banners: arBanners,
  collections: arCollections,
  bannerSliders: arBannerSliders,
  paymentMethods: arPaymentMethods,
  orders: arOrders,
  storeAddresses: arStoreAddresses,
  profile: arProfile,
  auth: arAuth,   
} as const;

// export const en: typeof ar = {
export const en = {
  global: enGlobal,
  products: enProducts,
  categories: enCategories,
  store: enStore,
  banners: enBanners,
  collections: enCollections,
  bannerSliders: enBannerSliders,
  paymentMethods: enPaymentMethods,
  orders: enOrders,
  storeAddresses: enStoreAddresses,
  profile: enProfile,
  auth: enAuth,
};

export const locales = {
  "ar-SY": ar,
  en,
} as const;

export type Locale = keyof typeof locales;
export type Messages = (typeof locales)[Locale];

export function getMessages(locale: Locale) {
  return locales[locale];
}