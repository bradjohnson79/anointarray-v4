import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  products: defineTable({
    slug: v.string(),
    name: v.string(),
    price: v.number(),
    createdAt: v.number(),
    teaserDescription: v.optional(v.string()),
    fullDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    imageGallery: v.optional(v.array(v.string())),
  }).index("by_slug", ["slug"]),

  productVariants: defineTable({
    productId: v.id("products"),
    style: v.optional(v.string()),
    price: v.number(),
    quantity: v.optional(v.number()),
    sku: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_product", ["productId"]),

  appConfig: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  vipWaitlist: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    interests: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  contactForms: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    formType: v.optional(v.string()),
    createdAt: v.number(),
  }),

  orders: defineTable({
    userEmail: v.string(),
    orderNumber: v.string(),
    totalAmount: v.number(),
    paymentStatus: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Customer + contact
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    // Payment/shipping totals
    subtotal: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    shippingAmount: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    // Addresses
    shippingAddress: v.optional(v.any()),
    billingAddress: v.optional(v.any()),
    trackingNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    refundAmount: v.optional(v.number()),
    // Tax & customs
    buyerCountry: v.optional(v.string()),
    shippingCountry: v.optional(v.string()),
    taxSubtotalCad: v.optional(v.number()),
    taxBreakdown: v.optional(v.any()),
    dutiesEstimatedCad: v.optional(v.number()),
    taxesEstimatedCad: v.optional(v.number()),
    dutiesTaxesCurrency: v.optional(v.string()),
    incoterm: v.optional(v.string()),
    // Status timestamps
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    refundedAt: v.optional(v.number()),
  }).index("by_email", ["userEmail"]).index('by_orderNumber', ['orderNumber']),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    quantity: v.number(),
    price: v.number(),
    // Customs snapshot fields
    hsCode: v.optional(v.string()),
    countryOfOrigin: v.optional(v.string()),
    customsDescription: v.optional(v.string()),
    unitValueCad: v.optional(v.number()),
    massGramsEach: v.optional(v.number()),
    isDigital: v.optional(v.boolean()),
  }).index("by_order", ["orderId"]),

  shipments: defineTable({
    orderId: v.id('orders'),
    orderNumber: v.string(),
    carrier: v.string(),
    trackingNumber: v.optional(v.string()),
    labelUrl: v.optional(v.string()),
    cost: v.optional(v.number()),
    service: v.optional(v.string()),
    estimatedDelivery: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    shipmentId: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    meta: v.optional(v.any()),
  }).index('by_order', ['orderId']).index('by_tracking', ['trackingNumber']),
});
