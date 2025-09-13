

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if orders already exist
    const existingOrders = await prisma.order.count();
    if (existingOrders > 0) {
      return NextResponse.json({ 
        message: 'Database already has orders',
        count: existingOrders 
      });
    }

    // Create products first (if they don't exist)
    const existingProducts = await prisma.product.count();
    if (existingProducts === 0) {
      await prisma.product.createMany({
        data: [
          {
            name: 'Chakra Balancing Crystal Array',
            slug: 'chakra-balancing-crystal-array',
            teaserDescription: 'Sterling silver pendant with healing crystals for chakra alignment',
            fullDescription: 'A beautifully crafted sterling silver pendant featuring carefully selected crystals for each chakra point.',
            price: 144.44,
            category: 'healing-jewelry',
            isPhysical: true,
            isDigital: false,
            inStock: true,
            hsCode: '7117.11.0000',
            countryOfOrigin: 'CA',
            customsDescription: 'Sterling silver chakra healing pendant with crystals',
            defaultCustomsValueCad: 144.44,
            massGrams: 45
          },
          {
            name: 'Sacred Frequency Healing Cards',
            slug: 'sacred-frequency-healing-cards',
            teaserDescription: 'Printed healing frequency cards set for meditation and energy work',
            fullDescription: 'A comprehensive set of healing frequency cards with sacred geometry patterns.',
            price: 100.00,
            category: 'healing-tools',
            isPhysical: true,
            isDigital: false,
            inStock: true,
            hsCode: '4901.99.0000',
            countryOfOrigin: 'CA',
            customsDescription: 'Printed healing frequency cards set',
            defaultCustomsValueCad: 100.00,
            massGrams: 150
          },
          {
            name: 'Digital Healing Frequency Pack',
            slug: 'digital-healing-frequency-pack',
            teaserDescription: 'Digital download of healing frequencies for meditation',
            fullDescription: 'A digital collection of healing frequencies calibrated for optimal energy work.',
            price: 144.44,
            category: 'digital-products',
            isPhysical: false,
            isDigital: true,
            inStock: true
          },
          {
            name: 'Sacred Geometry Pendant',
            slug: 'sacred-geometry-pendant',
            teaserDescription: 'Gold-plated pendant with healing stones',
            fullDescription: 'A gold-plated sacred geometry pendant featuring healing stones.',
            price: 77.77,
            category: 'healing-jewelry',
            isPhysical: true,
            isDigital: false,
            inStock: true,
            hsCode: '7117.19.0000',
            countryOfOrigin: 'CA',
            customsDescription: 'Gold-plated sacred geometry pendant with healing stones',
            defaultCustomsValueCad: 77.77,
            massGrams: 25
          },
          {
            name: 'Incomplete Customs Item',
            slug: 'incomplete-customs-item',
            teaserDescription: 'Item missing customs data for testing',
            fullDescription: 'This item is used to test customs validation.',
            price: 100.00,
            category: 'test-items',
            isPhysical: true,
            isDigital: false,
            inStock: true
            // Missing customs fields intentionally
          }
        ]
      });
    }

    // Get product IDs
    const products = await prisma.product.findMany({
      select: { id: true, name: true, hsCode: true, countryOfOrigin: true, customsDescription: true, defaultCustomsValueCad: true, massGrams: true, isDigital: true }
    });

    const productMap = products.reduce((acc: any, product: any) => {
      acc[product.name] = product;
      return acc;
    }, {} as any);

    // Sample orders with tax and customs data
    const sampleOrders = [
      {
        orderNumber: 'ANA-2024-001',
        customerName: 'Sarah Johnson',
        customerEmail: 'sarah.johnson@email.com',
        customerPhone: '+1-555-0124',
        status: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        totalAmount: 299.99,
        subtotal: 244.44,
        taxAmount: 24.44,
        shippingAmount: 31.11,
        buyerCountry: 'CA',
        shippingCountry: 'CA',
        taxSubtotalCad: 24.44,
        taxBreakdown: { hst: 24.44 },
        dutiesEstimatedCad: 0,
        taxesEstimatedCad: 0,
        dutiesTaxesCurrency: 'CAD',
        incoterm: 'DDP',
        trackingNumber: 'CA123456789',
        shippingAddress: {
          street: '123 Main St',
          city: 'Toronto',
          state: 'ON',
          country: 'CA',
          zip: 'M1A 1A1'
        },
        items: [
          {
            productId: productMap['Chakra Balancing Crystal Array']?.id,
            quantity: 1,
            price: 144.44,
            hsCode: productMap['Chakra Balancing Crystal Array']?.hsCode,
            countryOfOrigin: productMap['Chakra Balancing Crystal Array']?.countryOfOrigin,
            customsDescription: productMap['Chakra Balancing Crystal Array']?.customsDescription,
            unitValueCad: productMap['Chakra Balancing Crystal Array']?.defaultCustomsValueCad,
            massGramsEach: productMap['Chakra Balancing Crystal Array']?.massGrams,
            isDigital: false
          },
          {
            productId: productMap['Sacred Frequency Healing Cards']?.id,
            quantity: 1,
            price: 100.00,
            hsCode: productMap['Sacred Frequency Healing Cards']?.hsCode,
            countryOfOrigin: productMap['Sacred Frequency Healing Cards']?.countryOfOrigin,
            customsDescription: productMap['Sacred Frequency Healing Cards']?.customsDescription,
            unitValueCad: productMap['Sacred Frequency Healing Cards']?.defaultCustomsValueCad,
            massGramsEach: productMap['Sacred Frequency Healing Cards']?.massGrams,
            isDigital: false
          }
        ]
      },
      {
        orderNumber: 'ANA-2024-002',
        customerName: 'Michael Chen',
        customerEmail: 'michael.chen@email.com',
        customerPhone: '+1-555-0125',
        status: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'paypal',
        totalAmount: 144.44,
        subtotal: 144.44,
        taxAmount: 7.22,
        shippingAmount: 0,
        buyerCountry: 'CA',
        shippingCountry: 'CA',
        taxSubtotalCad: 7.22,
        taxBreakdown: { gst: 7.22 },
        dutiesEstimatedCad: 0,
        taxesEstimatedCad: 0,
        dutiesTaxesCurrency: 'CAD',
        incoterm: 'DDP',
        shippingAddress: {
          street: '789 Tech Ave',
          city: 'Vancouver',
          state: 'BC',
          country: 'CA',
          zip: 'V6B 2W2'
        },
        items: [
          {
            productId: productMap['Digital Healing Frequency Pack']?.id,
            quantity: 1,
            price: 144.44,
            isDigital: true
          }
        ]
      },
      {
        orderNumber: 'ANA-2024-003',
        customerName: 'John Smith',
        customerEmail: 'john.smith@usa.com',
        customerPhone: '+1-555-0126',
        status: 'processing',
        paymentStatus: 'paid',
        paymentMethod: 'stripe',
        totalAmount: 89.99,
        subtotal: 77.77,
        taxAmount: 0,
        shippingAmount: 12.22,
        buyerCountry: 'US',
        shippingCountry: 'US',
        taxSubtotalCad: 0,
        taxBreakdown: {},
        dutiesEstimatedCad: 5.50,
        taxesEstimatedCad: 3.89,
        dutiesTaxesCurrency: 'CAD',
        incoterm: 'DDP',
        shippingAddress: {
          street: '456 Liberty St',
          city: 'New York',
          state: 'NY',
          country: 'US',
          zip: '10001'
        },
        items: [
          {
            productId: productMap['Sacred Geometry Pendant']?.id,
            quantity: 1,
            price: 77.77,
            hsCode: productMap['Sacred Geometry Pendant']?.hsCode,
            countryOfOrigin: productMap['Sacred Geometry Pendant']?.countryOfOrigin,
            customsDescription: productMap['Sacred Geometry Pendant']?.customsDescription,
            unitValueCad: productMap['Sacred Geometry Pendant']?.defaultCustomsValueCad,
            massGramsEach: productMap['Sacred Geometry Pendant']?.massGrams,
            isDigital: false
          }
        ]
      },
      {
        orderNumber: 'ANA-2024-004',
        customerName: 'Jessica Williams',
        customerEmail: 'jessica@usa.com',
        customerPhone: '+1-555-0127',
        status: 'pending',
        paymentStatus: 'paid',
        paymentMethod: 'paypal',
        totalAmount: 125.00,
        subtotal: 100.00,
        taxAmount: 0,
        shippingAmount: 25.00,
        buyerCountry: 'US',
        shippingCountry: 'US',
        taxSubtotalCad: 0,
        taxBreakdown: {},
        dutiesEstimatedCad: 8.75,
        taxesEstimatedCad: 5.25,
        dutiesTaxesCurrency: 'CAD',
        incoterm: 'DDP',
        shippingAddress: {
          street: '789 Market St',
          city: 'Los Angeles',
          state: 'CA',
          country: 'US',
          zip: '90210'
        },
        items: [
          {
            productId: productMap['Incomplete Customs Item']?.id,
            quantity: 1,
            price: 100.00,
            // Missing customs data - will show in customs issues
            isDigital: false
          }
        ]
      }
    ];

    // Create orders with order items
    for (const orderData of sampleOrders) {
      const { items, ...orderFields } = orderData;
      
      const order = await prisma.order.create({
        data: orderFields
      });

      // Create order items
      for (const item of items) {
        if (item.productId) {
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              ...item
            }
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Sample orders created successfully',
      count: sampleOrders.length
    });

  } catch (error) {
    console.error('Error creating sample orders:', error);
    return NextResponse.json(
      { error: 'Failed to create sample orders' },
      { status: 500 }
    );
  }
}
