
/**
 * Environment Variables Configuration
 * 
 * This file provides type-safe access to environment variables
 * and validates that required variables are present.
 */

// Server-side environment variables (never sent to client)
export const serverEnv = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // Authentication
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  
  // AI Models API
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  
  // Canada Post API
  CANPOST_DEV_USERNAME: process.env.CANPOST_DEV_USERNAME,
  CANPOST_DEV_PASSWORD: process.env.CANPOST_DEV_PASSWORD,
  CANPOST_PROD_USERNAME: process.env.CANPOST_PROD_USERNAME,
  CANPOST_PROD_PASSWORD: process.env.CANPOST_PROD_PASSWORD,
  
  // UPS API
  UPS_CLIENT_ID: process.env.UPS_CLIENT_ID,
  UPS_SECRET: process.env.UPS_SECRET,
  
  // PayPal API
  PAYPAL_CLIENT_ID_SANDBOX: process.env.PAYPAL_CLIENT_ID_SANDBOX,
  PAYPAL_CLIENT_SECRET_SANDBOX: process.env.PAYPAL_CLIENT_SECRET_SANDBOX,
  PAYPAL_CLIENT_ID_LIVE: process.env.PAYPAL_CLIENT_ID_LIVE,
  PAYPAL_SECRET_LIVE: process.env.PAYPAL_SECRET_LIVE,
  
  // Stripe API
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Resend Email API
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  
  // Now Payments API
  NOWPAYMENTS_PUBLIC_KEY: process.env.NOWPAYMENTS_PUBLIC_KEY,
  NOWPAYMENTS_API_KEY: process.env.NOWPAYMENTS_API_KEY,
  
  // Fourth Wall API
  FOURTHWALL_API_USERNAME: process.env.FOURTHWALL_API_USERNAME,
  FOURTHWALL_API_PASSWORD: process.env.FOURTHWALL_API_PASSWORD,
  FOURTHWALL_STOREFRONT_TOKEN: process.env.FOURTHWALL_STOREFRONT_TOKEN,
  
  // Legacy/Optional APIs
  ABACUSAI_API_KEY: process.env.ABACUSAI_API_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Email settings
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@anointarray.com',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

// Client-side environment variables (sent to browser)
// Only use NEXT_PUBLIC_ prefix for non-sensitive data
export const clientEnv = {
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY: process.env.NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY,
} as const;

// Validation function to check required environment variables
export function validateServerEnv() {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ] as const;
  
  const missing = requiredVars.filter(key => !serverEnv[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

// Helper functions for common environment checks
export const isDevelopment = serverEnv.NODE_ENV === 'development';
export const isProduction = serverEnv.NODE_ENV === 'production';
export const isTest = serverEnv.NODE_ENV === 'test';

// Type exports for better TypeScript support
export type ServerEnv = typeof serverEnv;
export type ClientEnv = typeof clientEnv;
